// pages/api/dev/topup.js
import { withAuth } from '../../../lib/auth';
import { db } from '../../../lib/db';

async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const user = req.user;
  const amount = parseFloat(req.body.amount) || 20000;

  await db.user.update({
    where: { id: user.id },
    data: { balance: { increment: amount } }
  });

  const updated = await db.user.findUnique({
    where: { id: user.id },
    select: { balance: true, name: true }
  });

  return res.status(200).json({
    message: `Rs.${amount.toLocaleString()} added to ${updated.name}'s account`,
    new_balance: updated.balance
  });
}

export default withAuth(handler);