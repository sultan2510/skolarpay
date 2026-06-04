// pages/api/auth/register.js
import { hash } from 'bcryptjs';
import { sign } from 'jsonwebtoken';
import { db, } from '../../../lib/db';
import { validatePhone, validateCNIC, genAccNum } from '../../../lib/auth';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const { name, phone, cnic, pin, role, university, degree, parent_phone } = req.body;

  if (!name?.trim())          return res.status(400).json({ error: 'Name is required' });
  if (!validatePhone(phone))  return res.status(400).json({ error: 'Invalid phone number (03XXXXXXXXX)' });
  if (!validateCNIC(cnic))    return res.status(400).json({ error: 'Invalid CNIC (XXXXX-XXXXXXX-X)' });
  if (!['student','parent'].includes(role)) return res.status(400).json({ error: 'Role must be student or parent' });
  if (!/^\d{4}$/.test(pin))  return res.status(400).json({ error: 'PIN must be exactly 4 digits' });

  try {
    const dup = await db.user.findFirst({ where: { OR: [{ phone }, { cnic }] } });
    if (dup?.phone === phone) return res.status(409).json({ error: 'Phone already registered' });
    if (dup?.cnic  === cnic)  return res.status(409).json({ error: 'CNIC already registered' });

    let parentId = null;
    if (role === 'student' && parent_phone) {
      const parent = await db.user.findUnique({ where: { phone: parent_phone } });
      if (!parent || parent.role !== 'parent')
        return res.status(404).json({ error: 'Parent account not found. Ask parent to register first.' });
      parentId = parent.id;
    }

    const pinHash = await hash(pin, 12);
    const user    = await db.user.create({
      data: {
        name: name.trim(), phone, cnic, pin_hash: pinHash, role,
        account_number: genAccNum(phone), balance: 0,
        kyc_verified: false, is_blocked: false,
        university: university?.trim() || null,
        degree:     degree?.trim()     || null,
        parent_id:  parentId,
      },
    });

    const token = sign({ userId: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '30d' });
    const { pin_hash, ...safe } = user;
    return res.status(201).json({ token, user: safe });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error. Please try again.' });
  }
}
