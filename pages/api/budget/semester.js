// pages/api/budget/semester.js
// 4.4 Semester Budget Planner
import { withAuth } from '../../../lib/auth';
import { db }       from '../../../lib/db';

async function handler(req, res) {
  const user = req.user;

  if (req.method === 'GET') {
    const plans = await db.semesterPlan.findMany({
      where: { user_id: user.id },
      orderBy: { created_at: 'desc' },
    });

    // Enrich active plan with spending data
    const active = plans.find(p => p.is_active);
    let enriched = null;
    if (active) {
      const now = new Date();

      // Total spent since semester start
      const spentAgg = await db.transaction.aggregate({
        where: {
          user_id:    user.id,
          type:       'debit',
          status:     'completed',
          created_at: { gte: active.start_date },
        },
        _sum: { amount: true },
      });
      const totalSpent = spentAgg._sum.amount || 0;

      // Days calculations
      const semStart    = new Date(active.start_date);
      const semEnd      = new Date(active.end_date);
      const totalDays   = Math.ceil((semEnd - semStart)     / 86400000);
      const daysPassed  = Math.ceil((now   - semStart)      / 86400000);
      const daysLeft    = Math.max(0, Math.ceil((semEnd - now) / 86400000));
      const weeksLeft   = Math.max(0, Math.ceil(daysLeft / 7));

      // Remaining budget
      const remaining   = Math.max(0, active.total_allowance - totalSpent);

      // Ideal spend per day so far vs actual
      const idealSpent  = (active.total_allowance / totalDays) * daysPassed;
      const onTrack     = totalSpent <= idealSpent * 1.1; // 10% tolerance

      enriched = {
        ...active,
        total_spent: totalSpent,
        remaining,
        days_left:   daysLeft,
        weeks_left:  weeksLeft,
        days_passed: daysPassed,
        on_track:    onTrack,
        // Calculated limits
        daily_limit:  active.total_allowance / totalDays,
        // How much should have been spent by now
        expected_spent: idealSpent,
        // Overspend / underspend
        variance: totalSpent - idealSpent,
      };
    }

    return res.status(200).json({ plans, active: enriched });
  }

  if (req.method === 'POST') {
    const { name, total_allowance, start_date, end_date } = req.body;
    if (!name || !total_allowance || !start_date || !end_date)
      return res.status(400).json({ error: 'name, total_allowance, start_date, end_date required' });

    const start    = new Date(start_date);
    const end      = new Date(end_date);
    const totalDays = Math.ceil((end - start) / 86400000);
    if (totalDays <= 0) return res.status(400).json({ error: 'end_date must be after start_date' });

    const totalMonths = totalDays / 30;
    const monthlyLimit = parseFloat(total_allowance) / totalMonths;
    const weeklyLimit  = parseFloat(total_allowance) / (totalDays / 7);

    // Deactivate any existing active plan
    await db.semesterPlan.updateMany({
      where: { user_id: user.id, is_active: true },
      data:  { is_active: false },
    });

    // Also update user's monthly_limit
    await db.user.update({
      where: { id: user.id },
      data:  { monthly_limit: Math.round(monthlyLimit) },
    });

    const plan = await db.semesterPlan.create({
      data: {
        user_id:         user.id,
        name:            name.trim(),
        total_allowance: parseFloat(total_allowance),
        start_date:      start,
        end_date:        end,
        monthly_limit:   Math.round(monthlyLimit),
        weekly_limit:    Math.round(weeklyLimit),
        is_active:       true,
      },
    });

    return res.status(201).json({ plan,
      message: `Semester plan created! Monthly limit: Rs.${Math.round(monthlyLimit).toLocaleString()}, Weekly: Rs.${Math.round(weeklyLimit).toLocaleString()}` });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

export default withAuth(handler);
