// pages/api/reports/spending.js
// 4.6 Spending Reports
import { withAuth } from '../../../lib/auth';
import { db }       from '../../../lib/db';

async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const user  = req.user;
  const now   = new Date();

  // Default: current month
  const from  = req.query.from
    ? new Date(req.query.from)
    : new Date(now.getFullYear(), now.getMonth(), 1);
  const to    = req.query.to ? new Date(req.query.to) : now;

  // All debit transactions in range
  const txns = await db.transaction.findMany({
    where: { user_id: user.id, type: 'debit', status: 'completed', created_at: { gte: from, lte: to } },
    orderBy: { created_at: 'desc' },
  });

  // Category breakdown
  const byCategory = {};
  for (const t of txns) {
    byCategory[t.category] = (byCategory[t.category] || 0) + t.amount;
  }
  const totalSpent = txns.reduce((a, t) => a + t.amount, 0);

  // Monthly trend (last 6 months)
  const monthlyTrend = [];
  for (let i = 5; i >= 0; i--) {
    const mStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const mEnd   = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59);
    const agg = await db.transaction.aggregate({
      where: { user_id: user.id, type: 'debit', status: 'completed', created_at: { gte: mStart, lte: mEnd } },
      _sum: { amount: true },
    });
    monthlyTrend.push({
      month: mStart.toLocaleDateString('en-PK', { month: 'short', year: '2-digit' }),
      amount: agg._sum.amount || 0,
    });
  }

  // Savings progress
  const goals = await db.savingsGoal.findMany({ where: { user_id: user.id } });
  const totalSaved  = goals.reduce((a, g) => a + g.saved_amount, 0);
  const totalTarget = goals.reduce((a, g) => a + g.target_amount, 0);

  // Active semester plan
  const plan = await db.semesterPlan.findFirst({
    where: { user_id: user.id, is_active: true },
  });
  let semesterData = null;
  if (plan) {
    const semSpentAgg = await db.transaction.aggregate({
      where: { user_id: user.id, type: 'debit', status: 'completed', created_at: { gte: plan.start_date } },
      _sum: { amount: true },
    });
    semesterData = {
      name:             plan.name,
      total_allowance:  plan.total_allowance,
      total_spent:      semSpentAgg._sum.amount || 0,
      remaining:        plan.total_allowance - (semSpentAgg._sum.amount || 0),
      monthly_limit:    plan.monthly_limit,
      weekly_limit:     plan.weekly_limit,
    };
  }

  return res.status(200).json({
    period:          { from, to },
    total_spent:     totalSpent,
    by_category:     byCategory,
    monthly_trend:   monthlyTrend,
    transactions:    txns.slice(0, 50),
    savings: {
      goals,
      total_saved:   totalSaved,
      total_target:  totalTarget,
      progress_pct:  totalTarget > 0 ? Math.round((totalSaved / totalTarget) * 100) : 0,
    },
    semester:        semesterData,
  });
}

export default withAuth(handler);
