// lib/auth.js
import { verify }  from 'jsonwebtoken';
import { compare } from 'bcryptjs';
import { db }      from './db';

export function withAuth(handler, opts = {}) {
  return async (req, res) => {
    const h = req.headers.authorization;
    if (!h?.startsWith('Bearer '))
      return res.status(401).json({ error: 'No token provided' });
    try {
      const payload = verify(h.split(' ')[1], process.env.JWT_SECRET);
      const user    = await db.user.findUnique({ where: { id: payload.userId } });
      if (!user) return res.status(401).json({ error: 'User not found' });
      if (opts.role && user.role !== opts.role)
        return res.status(403).json({ error: `${opts.role} access only` });
      req.user = user;
      return handler(req, res);
    } catch {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }
  };
}

export async function verifyPin(userId, pin) {
  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user) return false;
  return compare(String(pin), user.pin_hash);
}

export async function checkSpendingLimit(user, amount) {
  if (user.is_blocked) return { ok: false, reason: 'Spending blocked by parent' };
  if (!user.monthly_limit) return { ok: true };
  const start = new Date();
  start.setDate(1); start.setHours(0, 0, 0, 0);
  const agg = await db.transaction.aggregate({
    where: { user_id: user.id, type: 'debit', status: 'completed', created_at: { gte: start } },
    _sum:  { amount: true },
  });
  const spent = agg._sum.amount || 0;
  if (spent + amount > user.monthly_limit)
    return { ok: false, reason: `Exceeds monthly limit of Rs.${user.monthly_limit.toLocaleString()} set by parent` };
  return { ok: true };
}

export async function notify(userId, title, body, type = 'tx') {
  try {
    await db.notification.create({ data: { user_id: userId, title, body, type } });
  } catch {}
}

export function autoCategory(desc = '') {
  const d = desc.toLowerCase();
  if (/food|restaurant|cafe|lunch|dinner|biryani|pizza|canteen|chai|eat|dhabba/.test(d))      return 'food';
  if (/uber|careem|petrol|bus|rickshaw|transport|ride|taxi|metro|train/.test(d))               return 'transport';
  if (/school|college|university|tuition|course|book|fee|study|library|stationery/.test(d))   return 'education';
  if (/shop|mall|clothes|amazon|daraz|buy|fashion|shoes/.test(d))                             return 'shopping';
  if (/cinema|movie|game|concert|netflix|spotify|youtube|prime|entertainment|fun/.test(d))    return 'entertainment';
  if (/doctor|hospital|medicine|pharmacy|health|clinic/.test(d))                              return 'health';
  if (/electricity|gas|water|internet|wifi|bill|lesco|hesco|ssgc/.test(d))                    return 'utilities';
  if (/sent|received|transfer|pocket money|allowance/.test(d))                                return 'transfer';
  if (/topup|recharge|jazz|telenor|zong|ufone/.test(d))                                       return 'topup';
  if (/savings|goal|save/.test(d))                                                            return 'savings';
  return 'other';
}

export function validatePhone(p) {
  return /^((\+92|0092|92)?3[0-9]{9}|03[0-9]{9})$/.test((p || '').replace(/\s/g, ''));
}
export function validateCNIC(c) {
  return /^\d{5}-\d{7}-\d{1}$/.test(c || '');
}
export function genAccNum(phone) {
  return 'SP' + (phone || '').replace(/\D/g, '').slice(-8) +
    String(Math.floor(Math.random() * 100)).padStart(2, '0');
}
