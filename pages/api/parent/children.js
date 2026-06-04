// pages/api/parent/children.js
import { withAuth, verifyPin, notify } from '../../../lib/auth';
import { db } from '../../../lib/db';

async function handler(req, res) {
  const parent = req.user;
  if (parent.role !== 'parent') return res.status(403).json({ error: 'Parent access only' });

  if (req.method === 'GET') {
    const now = new Date(), start = new Date(now.getFullYear(), now.getMonth(), 1);
    const children = await db.user.findMany({
      where: { parent_id: parent.id },
      select: { id:true, name:true, phone:true, balance:true, monthly_limit:true,
        account_number:true, university:true, degree:true, is_blocked:true, created_at:true },
    });
    const enriched = await Promise.all(children.map(async c => {
      const [stats, recent, catBreakdown] = await Promise.all([
        db.transaction.aggregate({ where:{ user_id:c.id, type:'debit', status:'completed', created_at:{ gte:start } }, _sum:{ amount:true }, _count:true }),
        db.transaction.findMany({ where:{ user_id:c.id }, orderBy:{ created_at:'desc' }, take:5 }),
        db.transaction.findMany({ where:{ user_id:c.id, type:'debit', status:'completed', created_at:{ gte:start } } }),
      ]);
      const byCat = {};
      catBreakdown.forEach(t => { byCat[t.category] = (byCat[t.category]||0) + t.amount; });
      const monthlySpent = stats._sum.amount || 0;
      const limitPct = c.monthly_limit ? (monthlySpent / c.monthly_limit) * 100 : 0;
      return { ...c, monthly_spent: monthlySpent, tx_count: stats._count, recent_transactions: recent, spending_by_category: byCat, limit_percent: Math.round(limitPct) };
    }));
    return res.status(200).json({ children: enriched });
  }

  if (req.method === 'POST') {
    const { action, child_id, limit, blocked, amount, pin } = req.body;
    const pinOk = await verifyPin(parent.id, pin);
    if (!pinOk) return res.status(401).json({ error: 'Wrong PIN' });
    const child = await db.user.findFirst({ where:{ id:child_id, parent_id:parent.id } });
    if (!child) return res.status(404).json({ error: 'Child not found' });

    if (action === 'set_limit') {
      await db.user.update({ where:{ id:child_id }, data:{ monthly_limit:parseFloat(limit) } });
      await notify(child_id, '📋 Limit Updated', `Your monthly limit is now Rs.${parseFloat(limit).toLocaleString()}`, 'limit_warning');
      return res.status(200).json({ message:`Limit set to Rs.${parseFloat(limit).toLocaleString()}` });
    }
    if (action === 'set_block') {
      await db.user.update({ where:{ id:child_id }, data:{ is_blocked:!!blocked } });
      await notify(child_id, blocked?'🔒 Spending Blocked':'✅ Spending Unblocked', blocked?'Your parent blocked your spending':'Your parent restored your spending', 'limit_warning');
      return res.status(200).json({ message: blocked?'Child blocked':'Child unblocked' });
    }
    if (action === 'send_pocket_money') {
      const amt = parseFloat(amount);
      if (parent.balance < amt) return res.status(400).json({ error: 'Insufficient balance' });
      await db.$transaction([
        db.transaction.create({ data:{ user_id:parent.id, type:'debit', status:'completed', amount:amt, description:`Pocket money → ${child.name}`, category:'transfer', channel:'internal', counterparty_name:child.name, counterparty_user_id:child.id, reference_number:`PM-${Date.now()}` } }),
        db.transaction.create({ data:{ user_id:child.id, type:'credit', status:'completed', amount:amt, description:`Allowance from ${parent.name}`, category:'transfer', channel:'internal', counterparty_name:parent.name, counterparty_user_id:parent.id, reference_number:`PM-${Date.now()}` } }),
        db.user.update({ where:{ id:parent.id }, data:{ balance:{ decrement:amt } } }),
        db.user.update({ where:{ id:child.id  }, data:{ balance:{ increment:amt } } }),
      ]);
      await notify(child.id, '💰 Allowance Received', `Rs.${amt.toLocaleString()} from ${parent.name}`, 'tx');
      return res.status(200).json({ message:`Rs.${amt.toLocaleString()} sent to ${child.name}` });
    }
    return res.status(400).json({ error: 'Unknown action' });
  }
  return res.status(405).json({ error: 'Method not allowed' });
}
export default withAuth(handler);
