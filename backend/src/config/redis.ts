import Redis from 'ioredis';
import { Queue, Worker, QueueEvents, Processor, WorkerOptions } from 'bullmq';
import { env } from './env.js';
import { logger } from '../utils/logger.js';

// Redis Client Singleton
let redisClient: Redis | null = null;

export const getRedisClient = (): Redis => {
  if (!redisClient) {
    redisClient = new Redis(env.REDIS_URL, {
      maxRetriesPerRequest: null, // Required for BullMQ
      enableReadyCheck: false,
      retryStrategy: (times) => {
        if (times > 3) {
          logger.error('Redis connection failed after 3 retries');
          return null;
        }
        return Math.min(times * 200, 2000);
      },
    });

    redisClient.on('connect', () => {
      logger.info('✅ Redis connected successfully');
    });

    redisClient.on('error', (error) => {
      logger.error('❌ Redis connection error:', error);
    });

    redisClient.on('close', () => {
      logger.warn('📤 Redis connection closed');
    });
  }

  return redisClient;
};

// BullMQ connection config
export const getRedisConnection = () => ({
  connection: {
    host: new URL(env.REDIS_URL).hostname || 'localhost',
    port: parseInt(new URL(env.REDIS_URL).port) || 6379,
    password: new URL(env.REDIS_URL).password || undefined,
  },
});

// Queue Names
export const QUEUE_NAMES = {
  SHOPIFY_SYNC: 'shopify-sync',
  CUSTOMER_INGESTION: 'customer-ingestion',
  ORDER_INGESTION: 'order-ingestion',
  PRODUCT_INGESTION: 'product-ingestion',
  WEBHOOK_PROCESSING: 'webhook-processing',
} as const;

// Queue instances (lazy initialization)
const queues: Map<string, Queue> = new Map();

export const getQueue = (queueName: string): Queue => {
  if (!queues.has(queueName)) {
    const queue = new Queue(queueName, getRedisConnection());
    queues.set(queueName, queue);
    logger.info(`📦 Queue initialized: ${queueName}`);
  }
  return queues.get(queueName)!;
};

// Create a worker for a queue
export const createWorker = <T = unknown, R = unknown>(
  queueName: string,
  processor: Processor<T, R>,
  options?: Omit<WorkerOptions, 'connection'>
): Worker<T, R> => {
  const worker = new Worker<T, R>(queueName, processor, {
    ...getRedisConnection(),
    ...(options || {}),
  });

  worker.on('completed', (job) => {
    logger.debug(`✅ Job ${job.id} completed in queue ${queueName}`);
  });

  worker.on('failed', (job, error) => {
    logger.error(`❌ Job ${job?.id} failed in queue ${queueName}:`, error);
  });

  worker.on('error', (error) => {
    logger.error(`❌ Worker error in queue ${queueName}:`, error);
  });

  return worker;
};

// Queue Events for monitoring
export const createQueueEvents = (queueName: string): QueueEvents => {
  return new QueueEvents(queueName, getRedisConnection());
};

// Graceful shutdown
export const closeRedis = async (): Promise<void> => {
  try {
    // Close all queues
    for (const [name, queue] of queues) {
      await queue.close();
      logger.info(`📤 Queue closed: ${name}`);
    }
    queues.clear();

    // Close Redis client
    if (redisClient) {
      await redisClient.quit();
      redisClient = null;
      logger.info('📤 Redis disconnected');
    }
  } catch (error) {
    logger.error('❌ Error closing Redis:', error);
  }
};

// Health check
export const checkRedisHealth = async (): Promise<boolean> => {
  try {
    const client = getRedisClient();
    const result = await client.ping();
    return result === 'PONG';
  } catch (error) {
    logger.error('Redis health check failed:', error);
    return false;
  }
};

export default getRedisClient;

