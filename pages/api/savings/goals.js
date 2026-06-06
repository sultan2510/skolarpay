// pages/api/savings/goals.js
import { withAuth, verifyPin } from '../../../lib/auth';
import { db } from '../../../lib/db';

// FIX: Map UI 'type' values → DB category values
const TYPE_TO_CATEGORY = {
  LAPTOP:       'laptop',
  BOOKS:        'books',
  REGISTRATION: 'registration',
  TRIP:         'trip',
  GENERAL:      'general',
};

// Helper: map DB goal → UI-compatible shape
function mapGoal(g) {
  return {
    ...g,
    // FIX 5: UI reads createdAt (camelCase) — DB stores created_at (snake_case)
    createdAt:     g.created_at,
    // FIX 4: UI reads g.title, g.currentAmount, g.targetAmount
    title:         g.name,
    currentAmount: g.saved_amount,
    targetAmount:  g.target_amount,
  };
}

async function handler(req, res) {
  const user = req.user;

  // ── GET ─────────────────────────────────────────────────────
  if (req.method === 'GET') {
    const goals = await db.savingsGoal.findMany({
      where:   { user_id: user.id },
      orderBy: { created_at: 'desc' },
    });
    // FIX 4: Return mapped goals with UI-compatible field names
    return res.status(200).json({ goals: goals.map(mapGoal) });
  }

  // ── POST: Create goal ────────────────────────────────────────
  if (req.method === 'POST') {
    // FIX 1: Accept 'title' (UI) or 'name' (legacy)
    // FIX 2: Accept 'type' (UI) or 'category' (legacy)
    // FIX 3: target_date is optional — default to 1 year from now
    const { title, name, target_amount, type, category, target_date, emoji } = req.body;

    const goalName = title || name;
    if (!goalName?.trim()) return res.status(400).json({ error: 'title is required' });
    if (!target_amount)    return res.status(400).json({ error: 'target_amount is required' });

    const amt = parseFloat(target_amount);
    if (isNaN(amt) || amt <= 0) return res.status(400).json({ error: 'Invalid target_amount' });

    // FIX 2: Map type → category, fallback to 'general'
    const resolvedCategory = TYPE_TO_CATEGORY[type] || category || 'general';

    // FIX 3: target_date optional — default 1 year from now
    const resolvedDate = target_date
      ? new Date(target_date)
      : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);

    const goal = await db.savingsGoal.create({
      data: {
        user_id:      user.id,
        name:         goalName.trim(),
        emoji:        emoji || '🎯',
        category:     resolvedCategory,
        target_amount: amt,
        saved_amount:  0,
        target_date:   resolvedDate,
        completed:     false,
      },
    });

    return res.status(201).json({ goal: mapGoal(goal) });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

export default withAuth(handler);