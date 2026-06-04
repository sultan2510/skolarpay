// pages/api/transfer/ibft.js
import { withAuth, verifyPin, checkSpendingLimit, notify } from '../../../lib/auth';
import { db } from '../../../lib/db';
async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const { bank_code, iban, account_title, amount, pin, purpose } = req.body;
  const sender = req.user;
  if (!bank_code || !iban || !account_title || !amount || !pin) return res.status(400).json({ error: 'All fields required' });
  if (!/^PK\d{2}[A-Z]{4}\d{16}$/.test(iban)) return res.status(400).json({ error: 'Invalid IBAN format' });
  const amt = parseFloat(amount);
  const pinOk = await verifyPin(sender.id, pin);
  if (!pinOk) return res.status(401).json({ error: 'Wrong PIN' });
  const lc = await checkSpendingLimit(sender, amt);
  if (!lc.ok) return res.status(403).json({ error: lc.reason });
  if (sender.balance < amt) return res.status(400).json({ error: 'Insufficient balance' });
  const ref = `IBFT-${Date.now()}`;
  const [tx] = await db.$transaction([
    db.transaction.create({ data:{ user_id:sender.id, type:'debit', status:'pending', amount:amt, description:`${bank_code} Transfer — ${account_title}`, category:'bank_transfer', channel:'ibft', bank_code, counterparty_name:account_title, counterparty_account:iban, reference_number:ref } }),
    db.user.update({ where:{ id:sender.id }, data:{ balance:{ decrement:amt } } }),
  ]);
  if (sender.parent_id) await notify(sender.parent_id, '🏦 Bank Transfer', `${sender.name} sent Rs.${amt.toLocaleString()} to ${bank_code}`, 'tx');
  return res.status(200).json({ transaction:tx, message:`IBFT of Rs.${amt.toLocaleString()} to ${bank_code} initiated` });
}
export default withAuth(handler);
