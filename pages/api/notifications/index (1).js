// pages/api/notifications/index.js
import { withAuth } from '../../../lib/auth';
import { db }       from '../../../lib/db';
async function handler(req, res) {
  const user = req.user;
  if (req.method === 'GET') {
    const notifications = await db.notification.findMany({ where:{ user_id:user.id }, orderBy:{ created_at:'desc' }, take:50 });
    return res.status(200).json({ notifications, unread_count: notifications.filter(n=>!n.read).length });
  }
  if (req.method === 'PATCH') {
    await db.notification.updateMany({ where:{ user_id:user.id, read:false }, data:{ read:true } });
    return res.status(200).json({ message:'All read' });
  }
  return res.status(405).json({ error: 'Method not allowed' });
}
export default withAuth(handler);
