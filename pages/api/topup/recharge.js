// pages/api/topup/recharge.js
import { withAuth, verifyPin, checkSpendingLimit, notify } from '../../../lib/auth';
import { db } from '../../../lib/db';
async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const { mobile_number, network, amount, pin } = req.body;
  const NETS = ['jazz','telenor','zong','ufone','ptcl','sco'];
  if (!NETS.includes((network||'').toLowerCase())) return res.status(400).json({ error: `Invalid network` });
  const user = req.user, amt = parseFloat(amount);
  if (amt < 10 || amt > 10000) return res.status(400).json({ error: 'Amount must be Rs.10–Rs.10,000' });
  const pinOk = await verifyPin(user.id, pin);
  if (!pinOk) return res.status(401).json({ error: 'Wrong PIN' });
  const lc = await checkSpendingLimit(user, amt);
  if (!lc.ok) return res.status(403).json({ error: lc.reason });
  if (user.balance < amt) return res.status(400).json({ error: 'Insufficient balance' });
  const nl = network.charAt(0).toUpperCase()+network.slice(1), ref = `TOPUP-${Date.now()}`;
  const [tx] = await db.$transaction([
    db.transaction.create({ data:{ user_id:user.id, type:'debit', status:'completed', amount:amt, description:`${nl} Topup — ${mobile_number}`, category:'topup', channel:'topup', counterparty_name:nl, counterparty_account:mobile_number, reference_number:ref } }),
    db.user.update({ where:{ id:user.id }, data:{ balance:{ decrement:amt } } }),
  ]);
  if (user.parent_id) await notify(user.parent_id, '📱 Topup', `${user.name} recharged Rs.${amt} to ${mobile_number}`, 'tx');
  return res.status(200).json({ transaction:tx, message:`Rs.${amt} recharged to ${mobile_number}` });
}
export default withAuth(handler);
