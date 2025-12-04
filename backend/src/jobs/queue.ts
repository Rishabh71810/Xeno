import { Queue, Job, JobsOptions } from 'bullmq';
import { getQueue, QUEUE_NAMES } from '../config/redis.js';
import { logger } from '../utils/logger.js';
import { SyncJobData, WebhookJobData } from '../types/index.js';

// Default job options
const defaultJobOptions: JobsOptions = {
  removeOnComplete: 100, // Keep last 100 completed jobs
  removeOnFail: 50, // Keep last 50 failed jobs
  attempts: 3,
  backoff: {
    type: 'exponential',
    delay: 5000,
  },
};

/**
 * Add a customer ingestion job to the queue
 */
export const queueCustomerIngestion = async (
  data: SyncJobData,
  options?: Partial<JobsOptions>
): Promise<Job> => {
  const queue = getQueue(QUEUE_NAMES.CUSTOMER_INGESTION);
  
  const job = await queue.add('ingest-customers', data, {
    ...defaultJobOptions,
    ...options,
    jobId: `customer-${data.tenantId}-${Date.now()}`,
  });

  logger.debug(`Queued customer ingestion job: ${job.id}`);
  return job;
};

/**
 * Add an order ingestion job to the queue
 */
export const queueOrderIngestion = async (
  data: SyncJobData,
  options?: Partial<JobsOptions>
): Promise<Job> => {
  const queue = getQueue(QUEUE_NAMES.ORDER_INGESTION);
  
  const job = await queue.add('ingest-orders', data, {
    ...defaultJobOptions,
    ...options,
    jobId: `order-${data.tenantId}-${Date.now()}`,
  });

  logger.debug(`Queued order ingestion job: ${job.id}`);
  return job;
};

/**
 * Add a product ingestion job to the queue
 */
export const queueProductIngestion = async (
  data: SyncJobData,
  options?: Partial<JobsOptions>
): Promise<Job> => {
  const queue = getQueue(QUEUE_NAMES.PRODUCT_INGESTION);
  
  const job = await queue.add('ingest-products', data, {
    ...defaultJobOptions,
    ...options,
    jobId: `product-${data.tenantId}-${Date.now()}`,
  });

  logger.debug(`Queued product ingestion job: ${job.id}`);
  return job;
};

/**
 * Add a webhook processing job to the queue
 */
export const queueWebhookProcessing = async (
  data: WebhookJobData,
  options?: Partial<JobsOptions>
): Promise<Job> => {
  const queue = getQueue(QUEUE_NAMES.WEBHOOK_PROCESSING);
  
  const job = await queue.add('process-webhook', data, {
    ...defaultJobOptions,
    ...options,
    jobId: `webhook-${data.tenantId}-${data.topic}-${Date.now()}`,
    priority: 1, // Webhooks have higher priority
  });

  logger.debug(`Queued webhook processing job: ${job.id}`);
  return job;
};

/**
 * Add a full sync job to the queue
 */
export const queueFullSync = async (
  data: SyncJobData,
  options?: Partial<JobsOptions>
): Promise<Job> => {
  const queue = getQueue(QUEUE_NAMES.SHOPIFY_SYNC);
  
  const job = await queue.add('full-sync', data, {
    ...defaultJobOptions,
    ...options,
    jobId: `full-sync-${data.tenantId}-${Date.now()}`,
    attempts: 2, // Fewer retries for full sync
  });

  logger.debug(`Queued full sync job: ${job.id}`);
  return job;
};

/**
 * Get queue status and metrics
 */
export const getQueueMetrics = async (queueName: string): Promise<{
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
}> => {
  const queue = getQueue(queueName);
  
  const [waiting, active, completed, failed, delayed] = await Promise.all([
    queue.getWaitingCount(),
    queue.getActiveCount(),
    queue.getCompletedCount(),
    queue.getFailedCount(),
    queue.getDelayedCount(),
  ]);

  return { waiting, active, completed, failed, delayed };
};

/**
 * Get all queue metrics
 */
export const getAllQueueMetrics = async (): Promise<Record<string, Awaited<ReturnType<typeof getQueueMetrics>>>> => {
  const metrics: Record<string, Awaited<ReturnType<typeof getQueueMetrics>>> = {};
  
  for (const queueName of Object.values(QUEUE_NAMES)) {
    metrics[queueName] = await getQueueMetrics(queueName);
  }
  
  return metrics;
};

/**
 * Retry failed jobs in a queue
 */
export const retryFailedJobs = async (queueName: string): Promise<number> => {
  const queue = getQueue(queueName);
  const failedJobs = await queue.getFailed();
  
  let retriedCount = 0;
  for (const job of failedJobs) {
    await job.retry();
    retriedCount++;
  }
  
  logger.info(`Retried ${retriedCount} failed jobs in queue ${queueName}`);
  return retriedCount;
};

/**
 * Clear all jobs from a queue
 */
export const clearQueue = async (queueName: string): Promise<void> => {
  const queue = getQueue(queueName);
  
  await queue.obliterate({ force: true });
  
  logger.info(`Cleared all jobs from queue ${queueName}`);
};

