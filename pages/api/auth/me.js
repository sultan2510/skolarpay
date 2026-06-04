// pages/api/auth/me.js
import { withAuth } from '../../../lib/auth';
import { db }       from '../../../lib/db';
async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  const now = new Date(), start = new Date(now.getFullYear(), now.getMonth(), 1);
  const [s,r] = await Promise.all([
    db.transaction.aggregate({ where:{ user_id:req.user.id, type:'debit',  status:'completed', created_at:{ gte:start } }, _sum:{ amount:true } }),
    db.transaction.aggregate({ where:{ user_id:req.user.id, type:'credit', status:'completed', created_at:{ gte:start } }, _sum:{ amount:true } }),
  ]);
  const { pin_hash, ...safe } = req.user;
  return res.status(200).json({ user: { ...safe, monthly_spent: s._sum.amount||0, monthly_received: r._sum.amount||0 } });
}
export default withAuth(handler);
