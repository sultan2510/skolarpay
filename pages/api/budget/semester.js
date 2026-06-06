// pages/api/budget/semester.js
import { withAuth } from '../../../lib/auth';
import { db }       from '../../../lib/db';

async function handler(req, res) {
  const user = req.user;

  // ── GET ─────────────────────────────────────────────────────
  if (req.method === 'GET') {
    const plans = await db.semesterPlan.findMany({
      where:   { user_id: user.id },
      orderBy: { created_at: 'desc' },
    });

    const active = plans.find(p => p.is_active);
    let enriched = null;

    if (active) {
      const now = new Date();
      const spentAgg = await db.transaction.aggregate({
        where: { user_id: user.id, type:'debit', status:'completed', created_at:{ gte: active.start_date } },
        _sum: { amount: true },
      });
      const totalSpent  = spentAgg._sum.amount || 0;
      const semStart    = new Date(active.start_date);
      const semEnd      = new Date(active.end_date);
      const totalDays   = Math.ceil((semEnd - semStart) / 86400000);
      const daysPassed  = Math.ceil((now - semStart)    / 86400000);
      const daysLeft    = Math.max(0, Math.ceil((semEnd - now) / 86400000));
      const weeksLeft   = Math.max(0, Math.ceil(daysLeft / 7));
      const remaining   = Math.max(0, active.total_allowance - totalSpent);
      const idealSpent  = (active.total_allowance / totalDays) * daysPassed;
      const onTrack     = totalSpent <= idealSpent * 1.1;

      enriched = {
        ...active,
        // FIX 5: Map DB fields → UI expected field names
        title:            active.name,           // UI reads plan.title
        totalAllowance:   active.total_allowance, // UI reads plan.totalAllowance
        monthlyLimit:     active.monthly_limit,   // UI reads plan.monthlyLimit
        weeklyLimit:      active.weekly_limit,    // UI reads plan.weeklyLimit
        remainingBalance: remaining,              // UI reads plan.remainingBalance
        // Extra enrichment
        total_spent:      totalSpent,
        days_left:        daysLeft,
        weeks_left:       weeksLeft,
        days_passed:      daysPassed,
        on_track:         onTrack,
        daily_limit:      active.total_allowance / totalDays,
        expected_spent:   idealSpent,
        variance:         totalSpent - idealSpent,
      };
    }

    // FIX 6: UI reads response.plan (not response.active)
    return res.status(200).json({ plans, active: enriched, plan: enriched });
  }

  // ── POST ────────────────────────────────────────────────────
  if (req.method === 'POST') {
    // FIX 1: Accept 'title'+'duration_months' (UI) OR 'name'+'start_date'+'end_date' (legacy)
    const { title, name, total_allowance, duration_months, start_date, end_date } = req.body;

    const planName = title || name;
    if (!planName || !total_allowance)
      return res.status(400).json({ error: 'title and total_allowance are required' });

    let start, end;

    if (duration_months) {
      // FIX 2: UI sends duration_months — derive start/end automatically
      start = new Date();
      end   = new Date();
      end.setMonth(end.getMonth() + parseInt(duration_months));
    } else if (start_date && end_date) {
      start = new Date(start_date);
      end   = new Date(end_date);
    } else {
      return res.status(400).json({ error: 'Provide either duration_months or start_date + end_date' });
    }

    const totalDays = Math.ceil((end - start) / 86400000);
    if (totalDays <= 0) return res.status(400).json({ error: 'end_date must be after start_date' });

    const totalMonths  = totalDays / 30;
    const monthlyLimit = parseFloat(total_allowance) / totalMonths;
    const weeklyLimit  = parseFloat(total_allowance) / (totalDays / 7);

    // Deactivate any existing active plan
    await db.semesterPlan.updateMany({
      where: { user_id: user.id, is_active: true },
      data:  { is_active: false },
    });

    // Sync user's monthly_limit
    await db.user.update({
      where: { id: user.id },
      data:  { monthly_limit: Math.round(monthlyLimit) },
    });

    const plan = await db.semesterPlan.create({
      data: {
        user_id:         user.id,
        name:            planName.trim(),
        total_allowance: parseFloat(total_allowance),
        start_date:      start,
        end_date:        end,
        monthly_limit:   Math.round(monthlyLimit),
        weekly_limit:    Math.round(weeklyLimit),
        is_active:       true,
      },
    });

    // FIX 3: Return UI-compatible field names in response
    return res.status(201).json({
      plan: {
        ...plan,
        title:            plan.name,
        totalAllowance:   plan.total_allowance,
        monthlyLimit:     plan.monthly_limit,
        weeklyLimit:      plan.weekly_limit,
        remainingBalance: plan.total_allowance,
      },
      message: `Budget created! Monthly: Rs.${Math.round(monthlyLimit).toLocaleString()}, Weekly: Rs.${Math.round(weeklyLimit).toLocaleString()}`,
    });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

export default withAuth(handler);