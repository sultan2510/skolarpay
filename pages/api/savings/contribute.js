// pages/api/savings/contribute.js
import { withAuth, verifyPin } from '../../../lib/auth';
import { db } from '../../../lib/db';
async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const { goal_id, amount, pin } = req.body;
  const user = req.user;
  const pinOk = await verifyPin(user.id, pin);
  if (!pinOk) return res.status(401).json({ error: 'Wrong PIN' });
  const goal = await db.savingsGoal.findFirst({ where:{ id:goal_id, user_id:user.id } });
  if (!goal) return res.status(404).json({ error: 'Goal not found' });
  if (goal.completed) return res.status(400).json({ error: 'Goal already completed' });
  const amt = parseFloat(amount);
  if (user.balance < amt) return res.status(400).json({ error: 'Insufficient balance' });
  const newSaved = goal.saved_amount + amt, completed = newSaved >= goal.target_amount;
  const [updated] = await db.$transaction([
    db.savingsGoal.update({ where:{ id:goal_id }, data:{ saved_amount:newSaved, completed } }),
    db.transaction.create({ data:{ user_id:user.id, type:'debit', status:'completed', amount:amt, description:`Savings: ${goal.name}`, category:'savings', channel:'internal', reference_number:`SAV-${Date.now()}` } }),
    db.user.update({ where:{ id:user.id }, data:{ balance:{ decrement:amt } } }),
  ]);
  return res.status(200).json({ goal:updated, message: completed ? `🎉 Goal "${goal.name}" completed!` : `Rs.${amt.toLocaleString()} added. ${Math.round((newSaved/goal.target_amount)*100)}% done.` });
}
export default withAuth(handler);
