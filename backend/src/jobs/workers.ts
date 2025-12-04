import { Worker, Job } from 'bullmq';
import { createWorker, QUEUE_NAMES } from '../config/redis.js';
import { logger } from '../utils/logger.js';
import { SyncJobData, WebhookJobData } from '../types/index.js';

// Store worker instances for cleanup
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const workers: Worker<any, any>[] = [];

/**
 * Initialize all background workers
 */
export const initializeWorkers = async (): Promise<void> => {
  try {
    // Customer ingestion worker
    const customerWorker = createWorker<SyncJobData, { processed: boolean }>(
      QUEUE_NAMES.CUSTOMER_INGESTION,
      async (job: Job<SyncJobData>) => {
        logger.info(`Processing customer ingestion job: ${job.id}`, job.data);
        // Actual implementation will be added in Phase 4
        return { processed: true };
      },
      {
        concurrency: 5,
        limiter: {
          max: 10,
          duration: 1000,
        },
      }
    );
    workers.push(customerWorker);

    // Order ingestion worker
    const orderWorker = createWorker<SyncJobData, { processed: boolean }>(
      QUEUE_NAMES.ORDER_INGESTION,
      async (job: Job<SyncJobData>) => {
        logger.info(`Processing order ingestion job: ${job.id}`, job.data);
        // Actual implementation will be added in Phase 4
        return { processed: true };
      },
      {
        concurrency: 5,
        limiter: {
          max: 10,
          duration: 1000,
        },
      }
    );
    workers.push(orderWorker);

    // Product ingestion worker
    const productWorker = createWorker<SyncJobData, { processed: boolean }>(
      QUEUE_NAMES.PRODUCT_INGESTION,
      async (job: Job<SyncJobData>) => {
        logger.info(`Processing product ingestion job: ${job.id}`, job.data);
        // Actual implementation will be added in Phase 4
        return { processed: true };
      },
      {
        concurrency: 5,
        limiter: {
          max: 10,
          duration: 1000,
        },
      }
    );
    workers.push(productWorker);

    // Webhook processing worker
    const webhookWorker = createWorker<WebhookJobData, { processed: boolean }>(
      QUEUE_NAMES.WEBHOOK_PROCESSING,
      async (job: Job<WebhookJobData>) => {
        logger.info(`Processing webhook job: ${job.id}`, job.data);
        // Actual implementation will be added in Phase 4
        return { processed: true };
      },
      {
        concurrency: 10,
        limiter: {
          max: 20,
          duration: 1000,
        },
      }
    );
    workers.push(webhookWorker);

    // Full sync worker
    const syncWorker = createWorker<SyncJobData, { processed: boolean }>(
      QUEUE_NAMES.SHOPIFY_SYNC,
      async (job: Job<SyncJobData>) => {
        logger.info(`Processing full sync job: ${job.id}`, job.data);
        // Actual implementation will be added in Phase 5
        return { processed: true };
      },
      {
        concurrency: 2, // Limit concurrent full syncs
        limiter: {
          max: 1,
          duration: 60000, // 1 per minute per tenant
        },
      }
    );
    workers.push(syncWorker);

    logger.info(`✅ Initialized ${workers.length} background workers`);
  } catch (error) {
    logger.error('Failed to initialize workers:', error);
    throw error;
  }
};

/**
 * Gracefully shutdown all workers
 */
export const shutdownWorkers = async (): Promise<void> => {
  logger.info('Shutting down workers...');
  
  await Promise.all(
    workers.map(async (worker) => {
      try {
        await worker.close();
      } catch (error) {
        logger.error('Error closing worker:', error);
      }
    })
  );
  
  workers.length = 0;
  logger.info('All workers shut down');
};

/**
 * Get worker status
 */
export const getWorkersStatus = (): { name: string; running: boolean }[] => {
  return workers.map((worker) => ({
    name: worker.name,
    running: worker.isRunning(),
  }));
};

