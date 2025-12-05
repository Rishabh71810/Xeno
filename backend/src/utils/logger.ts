import winston from 'winston';

// Custom log format
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.printf(({ level, message, timestamp, stack, ...meta }) => {
    let log = `${timestamp} [${level.toUpperCase()}]: ${message}`;
    
    if (Object.keys(meta).length > 0) {
      log += ` ${JSON.stringify(meta)}`;
    }
    
    if (stack) {
      log += `\n${stack}`;
    }
    
    return log;
  })
);

// Console format with colors for development
const consoleFormat = winston.format.combine(
  winston.format.colorize({ all: true }),
  winston.format.timestamp({ format: 'HH:mm:ss' }),
  winston.format.printf(({ level, message, timestamp, stack, ...meta }) => {
    let log = `${timestamp} ${level}: ${message}`;
    
    if (Object.keys(meta).length > 0) {
      log += ` ${JSON.stringify(meta, null, 2)}`;
    }
    
    if (stack) {
      log += `\n${stack}`;
    }
    
    return log;
  })
);

// Create logger instance
export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  transports: [
    // Console transport
    new winston.transports.Console({
      format: process.env.NODE_ENV === 'production' ? logFormat : consoleFormat,
    }),
  ],
  // Don't exit on handled exceptions
  exitOnError: false,
});

// Stream for Morgan HTTP logging (if needed)
export const logStream = {
  write: (message: string) => {
    logger.info(message.trim());
  },
};

// Helper functions for structured logging
export const logRequest = (method: string, path: string, statusCode: number, duration: number) => {
  logger.info(`${method} ${path} ${statusCode} - ${duration}ms`);
};

export const logError = (error: Error, context?: Record<string, unknown>) => {
  logger.error(error.message, { 
    stack: error.stack,
    ...context 
  });
};

export const logSync = (tenantId: string, syncType: string, status: string, details?: Record<string, unknown>) => {
  logger.info(`Sync [${syncType}] for tenant ${tenantId}: ${status}`, details);
};

export default logger;


