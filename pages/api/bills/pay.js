// pages/api/bills/pay.js
import { withAuth, verifyPin, checkSpendingLimit, notify } from '../../../lib/auth';
import { db } from '../../../lib/db';
const BILLS = { electricity:{label:'Electricity Bill',emoji:'⚡'}, gas:{label:'Gas Bill',emoji:'🔥'}, water:{label:'Water Bill',emoji:'💧'}, internet:{label:'Internet Bill',emoji:'🌐'}, tuition:{label:'Tuition Fee',emoji:'🎓'}, cable:{label:'Cable TV',emoji:'📺'} };
async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const { bill_type, reference_number, amount, pin, utility_company } = req.body;
  if (!BILLS[bill_type]) return res.status(400).json({ error: 'Invalid bill_type' });
  const user = req.user, amt = parseFloat(amount);
  const pinOk = await verifyPin(user.id, pin);
  if (!pinOk) return res.status(401).json({ error: 'Wrong PIN' });
  const lc = await checkSpendingLimit(user, amt);
  if (!lc.ok) return res.status(403).json({ error: lc.reason });
  if (user.balance < amt) return res.status(400).json({ error: 'Insufficient balance' });
  const cat = BILLS[bill_type], ref = `BILL-${Date.now()}`;
  const [tx] = await db.$transaction([
    db.transaction.create({ data:{ user_id:user.id, type:'debit', status:'completed', amount:amt, description:`${cat.label}${utility_company?` (${utility_company})`:''}`, category:'utilities', channel:'bill', counterparty_name:utility_company||bill_type, counterparty_account:reference_number, reference_number:ref } }),
    db.user.update({ where:{ id:user.id }, data:{ balance:{ decrement:amt } } }),
  ]);
  if (user.parent_id) await notify(user.parent_id, `${cat.emoji} Bill Paid`, `${user.name} paid Rs.${amt.toLocaleString()} for ${cat.label}`, 'tx');
  return res.status(200).json({ transaction:tx, message:`${cat.label} paid` });
}
export default withAuth(handler);
