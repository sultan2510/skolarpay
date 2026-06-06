// pages/api/savings/contribute.js
import { withAuth, verifyPin } from '../../../lib/auth';
import { db } from '../../../lib/db';

async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { goal_id, amount, pin } = req.body;
  if (!goal_id) return res.status(400).json({ error: 'goal_id is required' });
  if (!amount)  return res.status(400).json({ error: 'amount is required' });
  if (!pin)     return res.status(400).json({ error: 'pin is required' });

  const amt = parseFloat(amount);
  if (isNaN(amt) || amt <= 0) return res.status(400).json({ error: 'Invalid amount' });

  const user = req.user;

  const pinOk = await verifyPin(user.id, pin);
  if (!pinOk) return res.status(401).json({ error: 'Wrong PIN' });

  // Validate goal belongs to user
  const goal = await db.savingsGoal.findFirst({ where:{ id: goal_id, user_id: user.id } });
  if (!goal) return res.status(404).json({ error: 'Goal not found' });
  if (goal.completed) return res.status(400).json({ error: 'Goal already completed' });

  // Fresh balance check
  const freshUser = await db.user.findUnique({ where:{ id: user.id }, select:{ balance:true } });
  if (freshUser.balance < amt)
    return res.status(400).json({ error: `Insufficient balance (Rs.${freshUser.balance.toLocaleString()})` });

  const newSaved = goal.saved_amount + amt;
  const completed = newSaved >= goal.target_amount;
  const ref = `SAV-${Date.now()}`;

  await db.$transaction([
    db.transaction.create({ data:{
      user_id: user.id, type:'debit', status:'completed', amount:amt,
      description: `Savings: ${goal.name}`, category:'savings',
      channel:'internal', counterparty_name: goal.name,
      reference_number: ref
    }}),
    db.user.update({ where:{ id: user.id }, data:{ balance:{ decrement: amt } } }),
    db.savingsGoal.update({ where:{ id: goal_id }, data:{ saved_amount: newSaved, completed } }),
  ]);

  return res.status(200).json({
    message: `Rs.${amt.toLocaleString()} added to "${goal.name}"${completed ? ' — Goal reached! 🎉' : ''}`,
    saved_amount:  newSaved,
    currentAmount: newSaved,
    completed,
  });
}

export default withAuth(handler);