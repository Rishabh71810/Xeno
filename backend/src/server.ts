import app from './app.js';
import { env } from './config/env.js';
import { connectDatabase, disconnectDatabase } from './config/database.js';
import { getRedisClient, closeRedis, checkRedisHealth } from './config/redis.js';
import { logger } from './utils/logger.js';
import { initializeWorkers, shutdownWorkers } from './jobs/workers.js';
import { startScheduler, stopScheduler } from './jobs/scheduler.js';

// Server instance
let server: ReturnType<typeof app.listen>;

// Graceful shutdown handler
const gracefulShutdown = async (signal: string): Promise<void> => {
  logger.info(`${signal} received. Starting graceful shutdown...`);

  // Stop accepting new connections
  if (server) {
    server.close(() => {
      logger.info('HTTP server closed');
    });
  }

  try {
    // Stop scheduler
    stopScheduler();
    logger.info('Scheduler stopped');

    // Shutdown workers
    await shutdownWorkers();
    logger.info('Workers shut down');

    // Close Redis connections
    await closeRedis();
    logger.info('Redis connections closed');

    // Disconnect from database
    await disconnectDatabase();
    logger.info('Database disconnected');

    logger.info('Graceful shutdown completed');
    process.exit(0);
  } catch (error) {
    logger.error('Error during graceful shutdown:', error);
    process.exit(1);
  }
};

// Start server
const startServer = async (): Promise<void> => {
  try {
    logger.info('Starting server...');
    logger.info(`Environment: ${env.NODE_ENV}`);

    // Connect to database
    await connectDatabase();

    // Initialize Redis (optional - will work without it)
    try {
      const redis = getRedisClient();
      const isRedisHealthy = await checkRedisHealth();
      if (isRedisHealthy) {
        logger.info('✅ Redis connected and healthy');
        
        // Initialize background workers
        await initializeWorkers();
        logger.info('✅ Background workers initialized');
        
        // Start scheduler
        startScheduler();
        logger.info('✅ Scheduler started');
      } else {
        logger.warn('⚠️ Redis not available - running without background jobs');
      }
    } catch (redisError) {
      logger.warn('⚠️ Redis connection failed - running without background jobs', redisError);
    }

    // Start HTTP server
    server = app.listen(env.PORT, () => {
      logger.info(`🚀 Server running on port ${env.PORT}`);
      logger.info(`📍 API available at http://localhost:${env.PORT}${env.API_PREFIX}`);
      logger.info(`💚 Health check at http://localhost:${env.PORT}/health`);
    });

    // Handle server errors
    server.on('error', (error: NodeJS.ErrnoException) => {
      if (error.code === 'EADDRINUSE') {
        logger.error(`Port ${env.PORT} is already in use`);
        process.exit(1);
      }
      throw error;
    });

  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Handle process signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (error: Error) => {
  logger.error('Uncaught Exception:', error);
  gracefulShutdown('uncaughtException');
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason: unknown) => {
  logger.error('Unhandled Rejection:', reason);
  gracefulShutdown('unhandledRejection');
});

// Start the server
startServer();



