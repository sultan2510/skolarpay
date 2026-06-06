// pages/api/bills/pay.js
import { withAuth, verifyPin, checkSpendingLimit, notify } from '../../../lib/auth';
import { db } from '../../../lib/db';

const BILLS = {
  // UI provider IDs mapped to labels
  iesco:       { label:'IESCO Electricity', emoji:'⚡', category:'utilities' },
  sngpl:       { label:'SNGPL Gas',         emoji:'🔥', category:'utilities' },
  wasa:        { label:'WASA Water',         emoji:'💧', category:'utilities' },
  nayatel:     { label:'Nayatel Internet',   emoji:'🌐', category:'utilities' },
  // Legacy bill_type keys (kept for backward compat)
  electricity: { label:'Electricity Bill',   emoji:'⚡', category:'utilities' },
  gas:         { label:'Gas Bill',           emoji:'🔥', category:'utilities' },
  water:       { label:'Water Bill',         emoji:'💧', category:'utilities' },
  internet:    { label:'Internet Bill',      emoji:'🌐', category:'utilities' },
  tuition:     { label:'Tuition Fee',        emoji:'🎓', category:'education' },
  cable:       { label:'Cable TV',           emoji:'📺', category:'entertainment' },
};

async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // FIX 1: Accept both 'provider' (UI) and 'bill_type' (legacy)
  const { provider, bill_type, consumer_number, reference_number, amount, pin, utility_company } = req.body;
  const billKey     = provider || bill_type;
  const consumerRef = consumer_number || reference_number;

  if (!billKey) return res.status(400).json({ error: 'provider is required' });
  if (!BILLS[billKey]) return res.status(400).json({ error: `Invalid provider "${billKey}". Valid: ${Object.keys(BILLS).join(', ')}` });
  if (!consumerRef) return res.status(400).json({ error: 'consumer_number is required' });
  if (!amount || !pin) return res.status(400).json({ error: 'amount and pin are required' });

  const user = req.user;
  const amt  = parseFloat(amount);
  if (isNaN(amt) || amt <= 0) return res.status(400).json({ error: 'Invalid amount' });

  const pinOk = await verifyPin(user.id, pin);
  if (!pinOk) return res.status(401).json({ error: 'Wrong PIN' });

  const lc = await checkSpendingLimit(user, amt);
  if (!lc.ok) return res.status(403).json({ error: lc.reason });

  // FIX 2: Fetch fresh balance — never trust stale req.user.balance
  const freshUser = await db.user.findUnique({ where:{ id: user.id }, select:{ balance:true } });
  if (freshUser.balance < amt)
    return res.status(400).json({ error: `Insufficient balance (Rs.${freshUser.balance.toLocaleString()})` });

  const cat = BILLS[billKey];
  const ref = `BILL-${Date.now()}`;
  const desc = `${cat.label} — Ref: ${consumerRef}${utility_company ? ` (${utility_company})` : ''}`;

  const [tx] = await db.$transaction([
    db.transaction.create({ data:{
      user_id: user.id, type:'debit', status:'completed', amount:amt,
      description: desc, category: cat.category, channel:'bill',
      counterparty_name: utility_company || cat.label,
      counterparty_account: consumerRef,
      reference_number: ref
    }}),
    db.user.update({ where:{ id:user.id }, data:{ balance:{ decrement:amt } } }),
  ]);

  if (user.parent_id)
    await notify(user.parent_id, `${cat.emoji} Bill Paid`, `${user.name} paid Rs.${amt.toLocaleString()} for ${cat.label}`, 'tx');

  // FIX 3: Return transactionId so UI success message works
  return res.status(200).json({
    transactionId: tx.id,
    transaction: tx,
    message: `${cat.label} paid successfully`
  });
}

export default withAuth(handler);
