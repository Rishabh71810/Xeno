import cron from 'node-cron';
import { getQueue, QUEUE_NAMES } from '../config/redis.js';
import { prisma } from '../config/database.js';
import { logger } from '../utils/logger.js';

// Store scheduled tasks for cleanup
const scheduledTasks: cron.ScheduledTask[] = [];

/**
 * Start all scheduled jobs
 */
export const startScheduler = (): void => {
  logger.info('Starting scheduler...');

  // Incremental sync every 15 minutes
  const incrementalSync = cron.schedule('*/15 * * * *', async () => {
    logger.info('Running scheduled incremental sync...');
    await queueIncrementalSync();
  }, {
    scheduled: true,
    timezone: 'UTC',
  });
  scheduledTasks.push(incrementalSync);

  // Full sync daily at 2 AM UTC
  const dailyFullSync = cron.schedule('0 2 * * *', async () => {
    logger.info('Running scheduled daily full sync...');
    await queueFullSync();
  }, {
    scheduled: true,
    timezone: 'UTC',
  });
  scheduledTasks.push(dailyFullSync);

  // Cleanup old sync logs weekly (Sunday at 3 AM)
  const cleanupLogs = cron.schedule('0 3 * * 0', async () => {
    logger.info('Running scheduled sync log cleanup...');
    await cleanupOldSyncLogs();
  }, {
    scheduled: true,
    timezone: 'UTC',
  });
  scheduledTasks.push(cleanupLogs);

  logger.info(`✅ Scheduler started with ${scheduledTasks.length} scheduled tasks`);
};

/**
 * Stop all scheduled jobs
 */
export const stopScheduler = (): void => {
  logger.info('Stopping scheduler...');
  
  scheduledTasks.forEach((task) => {
    task.stop();
  });
  
  scheduledTasks.length = 0;
  logger.info('Scheduler stopped');
};

/**
 * Queue incremental sync for all active tenants
 */
const queueIncrementalSync = async (): Promise<void> => {
  try {
    const activeTenants = await prisma.tenant.findMany({
      where: { isActive: true },
      select: { id: true, name: true, shopifyDomain: true },
    });

    const queue = getQueue(QUEUE_NAMES.SHOPIFY_SYNC);

    for (const tenant of activeTenants) {
      await queue.add(
        'incremental-sync',
        {
          tenantId: tenant.id,
          syncType: 'INCREMENTAL',
          triggeredBy: 'scheduler',
        },
        {
          jobId: `incremental-${tenant.id}-${Date.now()}`,
          removeOnComplete: 100,
          removeOnFail: 50,
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 5000,
          },
        }
      );
    }

    logger.info(`Queued incremental sync for ${activeTenants.length} tenants`);
  } catch (error) {
    logger.error('Failed to queue incremental sync:', error);
  }
};

/**
 * Queue full sync for all active tenants
 */
const queueFullSync = async (): Promise<void> => {
  try {
    const activeTenants = await prisma.tenant.findMany({
      where: { isActive: true },
      select: { id: true, name: true, shopifyDomain: true },
    });

    const queue = getQueue(QUEUE_NAMES.SHOPIFY_SYNC);

    for (const tenant of activeTenants) {
      await queue.add(
        'full-sync',
        {
          tenantId: tenant.id,
          syncType: 'FULL',
          triggeredBy: 'scheduler',
        },
        {
          jobId: `full-${tenant.id}-${Date.now()}`,
          removeOnComplete: 50,
          removeOnFail: 25,
          attempts: 2,
          backoff: {
            type: 'exponential',
            delay: 30000,
          },
          // Delay between tenant syncs to avoid overwhelming Shopify API
          delay: activeTenants.indexOf(tenant) * 60000, // 1 minute between each
        }
      );
    }

    logger.info(`Queued full sync for ${activeTenants.length} tenants`);
  } catch (error) {
    logger.error('Failed to queue full sync:', error);
  }
};

/**
 * Cleanup old sync logs (keep last 30 days)
 */
const cleanupOldSyncLogs = async (): Promise<void> => {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const result = await prisma.syncLog.deleteMany({
      where: {
        startedAt: {
          lt: thirtyDaysAgo,
        },
      },
    });

    logger.info(`Cleaned up ${result.count} old sync logs`);
  } catch (error) {
    logger.error('Failed to cleanup old sync logs:', error);
  }
};

/**
 * Manually trigger sync for a specific tenant
 */
export const triggerTenantSync = async (
  tenantId: string,
  syncType: 'FULL' | 'INCREMENTAL' | 'CUSTOMERS' | 'ORDERS' | 'PRODUCTS',
  triggeredBy: string
): Promise<string> => {
  const queue = getQueue(QUEUE_NAMES.SHOPIFY_SYNC);
  
  const job = await queue.add(
    `manual-${syncType.toLowerCase()}-sync`,
    {
      tenantId,
      syncType,
      triggeredBy,
    },
    {
      jobId: `${syncType.toLowerCase()}-${tenantId}-${Date.now()}`,
      removeOnComplete: 100,
      removeOnFail: 50,
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 5000,
      },
    }
  );

  logger.info(`Queued ${syncType} sync for tenant ${tenantId} by ${triggeredBy}`);
  
  return job.id || '';
};



