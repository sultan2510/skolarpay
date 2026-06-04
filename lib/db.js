// lib/db.js
import { PrismaClient } from '@prisma/client';
const g = globalThis;
export const db = g.prisma ?? new PrismaClient({ log: ['error'] });
if (process.env.NODE_ENV !== 'production') g.prisma = db;
