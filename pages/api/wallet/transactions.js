// pages/api/wallet/transactions.js
import { withAuth } from '../../../lib/auth';
import { db }       from '../../../lib/db';
async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  const page  = Math.max(1, parseInt(req.query.page  || '1', 10));
  const limit = Math.min(100, parseInt(req.query.limit || '20', 10));
  const where = { user_id: req.user.id };
  if (req.query.type)     where.type     = req.query.type;
  if (req.query.category) where.category = req.query.category;
  if (req.query.from || req.query.to) {
    where.created_at = {};
    if (req.query.from) where.created_at.gte = new Date(req.query.from);
    if (req.query.to)   where.created_at.lte = new Date(req.query.to);
  }
  const [transactions, total] = await Promise.all([
    db.transaction.findMany({ where, orderBy: { created_at: 'desc' }, skip: (page-1)*limit, take: limit }),
    db.transaction.count({ where }),
  ]);
  return res.status(200).json({ transactions, pagination: { page, limit, total, pages: Math.ceil(total/limit) } });
}
export default withAuth(handler);
