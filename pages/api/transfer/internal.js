// pages/api/transfer/internal.js
import { withAuth, verifyPin, checkSpendingLimit, notify, autoCategory } from '../../../lib/auth';
import { db } from '../../../lib/db';

async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // FIX 1: Accept both dest_phone (UI) and to_phone (legacy) 
  const { dest_phone, to_phone, amount, pin, note, description } = req.body;
  const recipientPhone = dest_phone || to_phone;

  // FIX 2: Accept both 'description' and 'note' from UI
  const transferNote = description || note;

  const sender = req.user;

  if (!recipientPhone || !amount || !pin)
    return res.status(400).json({ error: 'dest_phone, amount and pin required' });

  const amt = parseFloat(amount);
  if (isNaN(amt) || amt <= 0) return res.status(400).json({ error: 'Invalid amount' });
  if (sender.phone === recipientPhone) return res.status(400).json({ error: 'Cannot send to yourself' });

  const pinOk = await verifyPin(sender.id, pin);
  if (!pinOk) return res.status(401).json({ error: 'Wrong PIN' });

  const lc = await checkSpendingLimit(sender, amt);
  if (!lc.ok) return res.status(403).json({ error: lc.reason });

  // FIX 3: Fetch fresh balance from DB (never trust req.user.balance — it's stale)
  const freshSender = await db.user.findUnique({ where:{ id: sender.id }, select:{ balance:true } });
  if (freshSender.balance < amt)
    return res.status(400).json({ error: `Insufficient balance (Rs.${freshSender.balance.toLocaleString()})` });

  const receiver = await db.user.findUnique({ where: { phone: recipientPhone } });
  if (!receiver) return res.status(404).json({ error: 'No SkolarPay account found' });

  const ref  = `SP-${Date.now()}`;
  const desc = transferNote?.trim() ? `Sent to ${receiver.name}: ${transferNote}` : `Sent to ${receiver.name}`;

  const [tx] = await db.$transaction([
    db.transaction.create({ data:{
      user_id: sender.id, type:'debit', status:'completed', amount:amt,
      description: desc, category: autoCategory(desc), channel:'internal',
      counterparty_name: receiver.name, counterparty_account: receiver.account_number,
      counterparty_user_id: receiver.id, reference_number: ref
    }}),
    db.transaction.create({ data:{
      user_id: receiver.id, type:'credit', status:'completed', amount:amt,
      description: transferNote?.trim() ? `From ${sender.name}: ${transferNote}` : `From ${sender.name}`,
      category:'transfer', channel:'internal',
      counterparty_name: sender.name, counterparty_account: sender.account_number,
      counterparty_user_id: sender.id, reference_number: ref
    }}),
    db.user.update({ where:{ id:sender.id },   data:{ balance:{ decrement:amt } } }),
    db.user.update({ where:{ id:receiver.id }, data:{ balance:{ increment:amt } } }),
  ]);

  await notify(receiver.id, '💰 Money Received', `Rs.${amt.toLocaleString()} from ${sender.name}`, 'tx');
  if (sender.parent_id)
    await notify(sender.parent_id, '👀 Student Transfer', `${sender.name} sent Rs.${amt.toLocaleString()} to ${receiver.name}`, 'tx');

  return res.status(200).json({
    transactionId: tx.id,
    transaction: tx,
    message: `Rs.${amt.toLocaleString()} sent to ${receiver.name}`
  });
}

export default withAuth(handler);
