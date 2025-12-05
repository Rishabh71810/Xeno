import { PrismaClient } from '@prisma/client';
import { env } from './env.js';
import { logger } from '../utils/logger.js';

// Prisma Client Singleton
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: env.NODE_ENV === 'development' 
      ? ['query', 'info', 'warn', 'error']
      : ['error'],
  });

if (env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

// Database connection helper
export const connectDatabase = async (): Promise<void> => {
  try {
    await prisma.$connect();
    logger.info('✅ Database connected successfully');
  } catch (error) {
    logger.error('❌ Database connection failed:', error);
    process.exit(1);
  }
};

// Graceful shutdown
export const disconnectDatabase = async (): Promise<void> => {
  try {
    await prisma.$disconnect();
    logger.info('📤 Database disconnected');
  } catch (error) {
    logger.error('❌ Error disconnecting database:', error);
  }
};

// Multi-tenant helper: Get data filtered by tenant
export const getTenantPrisma = (tenantId: string) => {
  return {
    customer: {
      findMany: (args?: Parameters<typeof prisma.customer.findMany>[0]) =>
        prisma.customer.findMany({
          ...args,
          where: { ...args?.where, tenantId },
        }),
      findFirst: (args?: Parameters<typeof prisma.customer.findFirst>[0]) =>
        prisma.customer.findFirst({
          ...args,
          where: { ...args?.where, tenantId },
        }),
      count: (args?: Parameters<typeof prisma.customer.count>[0]) =>
        prisma.customer.count({
          ...args,
          where: { ...args?.where, tenantId },
        }),
    },
    order: {
      findMany: (args?: Parameters<typeof prisma.order.findMany>[0]) =>
        prisma.order.findMany({
          ...args,
          where: { ...args?.where, tenantId },
        }),
      findFirst: (args?: Parameters<typeof prisma.order.findFirst>[0]) =>
        prisma.order.findFirst({
          ...args,
          where: { ...args?.where, tenantId },
        }),
      count: (args?: Parameters<typeof prisma.order.count>[0]) =>
        prisma.order.count({
          ...args,
          where: { ...args?.where, tenantId },
        }),
    },
    product: {
      findMany: (args?: Parameters<typeof prisma.product.findMany>[0]) =>
        prisma.product.findMany({
          ...args,
          where: { ...args?.where, tenantId },
        }),
      findFirst: (args?: Parameters<typeof prisma.product.findFirst>[0]) =>
        prisma.product.findFirst({
          ...args,
          where: { ...args?.where, tenantId },
        }),
      count: (args?: Parameters<typeof prisma.product.count>[0]) =>
        prisma.product.count({
          ...args,
          where: { ...args?.where, tenantId },
        }),
    },
  };
};

export default prisma;



