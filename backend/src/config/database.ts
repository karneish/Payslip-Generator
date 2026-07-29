import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  log: ['warn', 'error'],
});

prisma.$connect().catch((err) => {
  console.error('[FATAL] Failed to connect to database:', err.message);
});

export { prisma };
