// pages/api/parent/children.js
import { withAuth, verifyPin, notify } from '../../../lib/auth';
import { db } from '../../../lib/db';

async function handler(req, res) {
  const parent = req.user;
  if (parent.role !== 'parent') return res.status(403).json({ error: 'Parent access only' });

  // ── GET: fetch all linked children with enriched stats ──────
  if (req.method === 'GET') {
    const now = new Date(), start = new Date(now.getFullYear(), now.getMonth(), 1);
    const children = await db.user.findMany({
      where: { parent_id: parent.id },
      select: {
        id:true, name:true, phone:true, balance:true, monthly_limit:true,
        account_number:true, university:true, degree:true, is_blocked:true, created_at:true
      },
    });
    const enriched = await Promise.all(children.map(async c => {
      const [stats, recent, catBreakdown] = await Promise.all([
        db.transaction.aggregate({
          where:{ user_id:c.id, type:'debit', status:'completed', created_at:{ gte:start } },
          _sum:{ amount:true }, _count:true
        }),
        db.transaction.findMany({
          where:{ user_id:c.id }, orderBy:{ created_at:'desc' }, take:5
        }),
        db.transaction.findMany({
          where:{ user_id:c.id, type:'debit', status:'completed', created_at:{ gte:start } }
        }),
      ]);
      const byCat = {};
      catBreakdown.forEach(t => { byCat[t.category] = (byCat[t.category] || 0) + t.amount; });
      const monthlySpent = stats._sum.amount || 0;
      const limitPct = c.monthly_limit ? (monthlySpent / c.monthly_limit) * 100 : 0;
      return {
        ...c,
        monthly_spent: monthlySpent,
        tx_count: stats._count,
        recent_transactions: recent,
        spending_by_category: byCat,
        limit_percent: Math.round(limitPct)
      };
    }));
    return res.status(200).json({ children: enriched });
  }

  // ── POST: perform a parent action on a child ────────────────
  if (req.method === 'POST') {
    const { action, child_id, limit, blocked, amount, pin } = req.body;

    // Validate PIN
    if (!pin) return res.status(400).json({ error: 'PIN is required' });
    const pinOk = await verifyPin(parent.id, pin);
    if (!pinOk) return res.status(401).json({ error: 'Wrong PIN' });

    // Validate child belongs to this parent
    if (!child_id) return res.status(400).json({ error: 'child_id is required' });
    const child = await db.user.findFirst({ where:{ id:child_id, parent_id:parent.id } });
    if (!child) return res.status(404).json({ error: 'Child not found' });

    // ── Action: set_limit ──────────────────────────────────────
    if (action === 'set_limit' || action === 'SET_SPENDING_LIMIT' || action === 'set_spending_limit') {
      const lmt = parseFloat(limit ?? amount);
      if (isNaN(lmt) || lmt < 0) return res.status(400).json({ error: 'Invalid limit amount' });
      await db.user.update({ where:{ id:child_id }, data:{ monthly_limit: lmt } });
      await notify(child_id, '📋 Limit Updated', `Your monthly limit is now Rs.${lmt.toLocaleString()}`, 'limit_warning');
      return res.status(200).json({ message: `Limit set to Rs.${lmt.toLocaleString()}` });
    }

    // ── Action: set_block ──────────────────────────────────────
    if (action === 'set_block' || action === 'TOGGLE_BLOCK_STATUS' || action === 'toggle_block_status') {
      // If frontend sends toggle, derive new blocked state from current child state
      const newBlocked = blocked !== undefined ? !!blocked : !child.is_blocked;
      await db.user.update({ where:{ id:child_id }, data:{ is_blocked: newBlocked } });
      await notify(
        child_id,
        newBlocked ? '🔒 Spending Blocked' : '✅ Spending Unblocked',
        newBlocked ? 'Your parent blocked your spending' : 'Your parent restored your spending',
        'limit_warning'
      );
      return res.status(200).json({ message: newBlocked ? 'Child blocked' : 'Child unblocked' });
    }

    // ── Action: send_pocket_money ──────────────────────────────
    if (action === 'send_pocket_money' || action === 'SEND_POCKET_MONEY') {
      const amt = parseFloat(amount);
      if (isNaN(amt) || amt <= 0) return res.status(400).json({ error: 'Invalid amount' });

      // FIX: Always fetch a fresh parent balance from DB — never trust req.user.balance
      // (req.user is a snapshot from login time and can be stale)
      const freshParent = await db.user.findUnique({ where:{ id: parent.id }, select:{ balance:true } });
      if (!freshParent) return res.status(404).json({ error: 'Parent account not found' });
      if (freshParent.balance < amt) {
        return res.status(400).json({
          error: `Insufficient balance. Your balance is Rs.${freshParent.balance.toLocaleString()}, transfer amount is Rs.${amt.toLocaleString()}`
        });
      }

      const ref = `PM-${Date.now()}`;
      await db.$transaction([
        db.transaction.create({
          data:{
            user_id: parent.id, type:'debit', status:'completed', amount:amt,
            description:`Pocket money → ${child.name}`, category:'transfer',
            channel:'internal', counterparty_name:child.name,
            counterparty_user_id:child.id, reference_number:ref
          }
        }),
        db.transaction.create({
          data:{
            user_id: child.id, type:'credit', status:'completed', amount:amt,
            description:`Allowance from ${parent.name}`, category:'transfer',
            channel:'internal', counterparty_name:parent.name,
            counterparty_user_id:parent.id, reference_number:ref
          }
        }),
        db.user.update({ where:{ id:parent.id }, data:{ balance:{ decrement:amt } } }),
        db.user.update({ where:{ id:child.id  }, data:{ balance:{ increment:amt } } }),
      ]);

      await notify(child.id, '💰 Allowance Received', `Rs.${amt.toLocaleString()} from ${parent.name}`, 'tx');
      return res.status(200).json({ message: `Rs.${amt.toLocaleString()} sent to ${child.name}` });
    }

    return res.status(400).json({ error: 'Unknown action' });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

export default withAuth(handler);