// pages/api/transfer/internal.js
import { withAuth, verifyPin, checkSpendingLimit, notify, autoCategory } from '../../../lib/auth';
import { db } from '../../../lib/db';
async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const { to_phone, amount, pin, note } = req.body;
  const sender = req.user;
  if (!to_phone || !amount || !pin) return res.status(400).json({ error: 'to_phone, amount and pin required' });
  const amt = parseFloat(amount);
  if (isNaN(amt) || amt <= 0) return res.status(400).json({ error: 'Invalid amount' });
  if (sender.phone === to_phone) return res.status(400).json({ error: 'Cannot send to yourself' });
  const pinOk = await verifyPin(sender.id, pin);
  if (!pinOk) return res.status(401).json({ error: 'Wrong PIN' });
  const lc = await checkSpendingLimit(sender, amt);
  if (!lc.ok) return res.status(403).json({ error: lc.reason });
  if (sender.balance < amt) return res.status(400).json({ error: `Insufficient balance (Rs.${sender.balance.toLocaleString()})` });
  const receiver = await db.user.findUnique({ where: { phone: to_phone } });
  if (!receiver) return res.status(404).json({ error: 'No SkolarPay account found' });
  const ref  = `SP-${Date.now()}`;
  const desc = note?.trim() ? `Sent to ${receiver.name}: ${note}` : `Sent to ${receiver.name}`;
  const [tx] = await db.$transaction([
    db.transaction.create({ data:{ user_id:sender.id, type:'debit', status:'completed', amount:amt, description:desc, category:autoCategory(desc), channel:'internal', counterparty_name:receiver.name, counterparty_account:receiver.account_number, counterparty_user_id:receiver.id, reference_number:ref } }),
    db.transaction.create({ data:{ user_id:receiver.id, type:'credit', status:'completed', amount:amt, description:note?.trim() ? `From ${sender.name}: ${note}` : `From ${sender.name}`, category:'transfer', channel:'internal', counterparty_name:sender.name, counterparty_account:sender.account_number, counterparty_user_id:sender.id, reference_number:ref } }),
    db.user.update({ where:{ id:sender.id },   data:{ balance:{ decrement:amt } } }),
    db.user.update({ where:{ id:receiver.id }, data:{ balance:{ increment:amt } } }),
  ]);
  await notify(receiver.id, '💰 Money Received', `Rs.${amt.toLocaleString()} from ${sender.name}`, 'tx');
  if (sender.parent_id) await notify(sender.parent_id, '👀 Student Transfer', `${sender.name} sent Rs.${amt.toLocaleString()} to ${receiver.name}`, 'tx');
  return res.status(200).json({ transaction:tx, message:`Rs.${amt.toLocaleString()} sent to ${receiver.name}` });
}
export default withAuth(handler);
