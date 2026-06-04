// pages/api/savings/goals.js
import { withAuth, verifyPin } from '../../../lib/auth';
import { db } from '../../../lib/db';
async function handler(req, res) {
  const user = req.user;
  if (req.method === 'GET') {
    const goals = await db.savingsGoal.findMany({ where:{ user_id:user.id }, orderBy:{ created_at:'desc' } });
    return res.status(200).json({ goals });
  }
  if (req.method === 'POST') {
    const { name, target_amount, target_date, emoji, category } = req.body;
    if (!name?.trim() || !target_amount || !target_date) return res.status(400).json({ error: 'name, target_amount, target_date required' });
    const goal = await db.savingsGoal.create({ data:{ user_id:user.id, name:name.trim(), emoji:emoji||'🎯', category:category||'general', target_amount:parseFloat(target_amount), saved_amount:0, target_date:new Date(target_date), completed:false } });
    return res.status(201).json({ goal });
  }
  return res.status(405).json({ error: 'Method not allowed' });
}
export default withAuth(handler);
