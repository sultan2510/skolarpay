// pages/api/auth/login.js
import { compare } from 'bcryptjs';
import { sign }    from 'jsonwebtoken';
import { db }      from '../../../lib/db';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const { phone, pin } = req.body;
  if (!phone || !pin) return res.status(400).json({ error: 'Phone and PIN required' });

  try {
    const user = await db.user.findUnique({ where: { phone } });
    if (!user) return res.status(401).json({ error: 'Invalid phone or PIN' });

    const ok = await compare(String(pin), user.pin_hash);
    if (!ok) return res.status(401).json({ error: 'Invalid phone or PIN' });

    await db.user.update({
      where: { id: user.id },
      data:  { failed_pin_attempts: 0, last_login: new Date() },
    }).catch(() => {});

    const now   = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const [spent, received] = await Promise.all([
      db.transaction.aggregate({ where:{ user_id:user.id, type:'debit',  status:'completed', created_at:{ gte:start } }, _sum:{ amount:true } }),
      db.transaction.aggregate({ where:{ user_id:user.id, type:'credit', status:'completed', created_at:{ gte:start } }, _sum:{ amount:true } }),
    ]);

    const token = sign({ userId: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '30d' });
    const { pin_hash, ...safe } = user;
    return res.status(200).json({
      token,
      user: { ...safe, monthly_spent: spent._sum.amount||0, monthly_received: received._sum.amount||0 },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
}
