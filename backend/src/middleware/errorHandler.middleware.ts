import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';
import { logger } from '../utils/logger.js';
import { sendError, sendValidationError, sendNotFound, sendConflict } from '../utils/apiResponse.js';

// Custom error class
export class AppError extends Error {
  public statusCode: number;
  public errorCode: string;
  public isOperational: boolean;
  public details?: unknown;

  constructor(
    message: string,
    statusCode: number = 500,
    errorCode: string = 'INTERNAL_ERROR',
    details?: unknown
  ) {
    super(message);
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.isOperational = true;
    this.details = details;
    
    Error.captureStackTrace(this, this.constructor);
  }
}

// Specific error types
export class NotFoundError extends AppError {
  constructor(message: string = 'Resource not found') {
    super(message, 404, 'NOT_FOUND');
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = 'Unauthorized') {
    super(message, 401, 'UNAUTHORIZED');
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = 'Forbidden') {
    super(message, 403, 'FORBIDDEN');
  }
}

export class BadRequestError extends AppError {
  constructor(message: string = 'Bad request', details?: unknown) {
    super(message, 400, 'BAD_REQUEST', details);
  }
}

export class ConflictError extends AppError {
  constructor(message: string = 'Resource already exists') {
    super(message, 409, 'CONFLICT');
  }
}

export class ValidationError extends AppError {
  constructor(message: string = 'Validation failed', details?: unknown) {
    super(message, 422, 'VALIDATION_ERROR', details);
  }
}

// Error handler middleware
export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): Response => {
  // Log the error
  logger.error('Error:', {
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    body: req.body,
    query: req.query,
  });

  // Handle Zod validation errors
  if (err instanceof ZodError) {
    const formattedErrors = err.errors.map((e) => ({
      field: e.path.join('.'),
      message: e.message,
    }));
    return sendValidationError(res, formattedErrors);
  }

  // Handle Prisma errors
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    return handlePrismaError(err, res);
  }

  if (err instanceof Prisma.PrismaClientValidationError) {
    return sendError(res, 'Database validation error', 400, 'DB_VALIDATION_ERROR');
  }

  // Handle custom AppError
  if (err instanceof AppError) {
    return sendError(res, err.message, err.statusCode, err.errorCode, err.details);
  }

  // Handle JWT errors
  if (err.name === 'JsonWebTokenError') {
    return sendError(res, 'Invalid token', 401, 'INVALID_TOKEN');
  }

  if (err.name === 'TokenExpiredError') {
    return sendError(res, 'Token expired', 401, 'TOKEN_EXPIRED');
  }

  // Handle unknown errors
  const statusCode = 500;
  const message = process.env.NODE_ENV === 'production' 
    ? 'Internal server error' 
    : err.message;

  return sendError(res, message, statusCode, 'INTERNAL_ERROR');
};

// Handle Prisma specific errors
const handlePrismaError = (
  err: Prisma.PrismaClientKnownRequestError,
  res: Response
): Response => {
  switch (err.code) {
    case 'P2002': {
      // Unique constraint violation
      const field = (err.meta?.target as string[])?.join(', ') || 'field';
      return sendConflict(res, `A record with this ${field} already exists`);
    }
    case 'P2025': {
      // Record not found
      return sendNotFound(res, 'Record not found');
    }
    case 'P2003': {
      // Foreign key constraint failed
      return sendError(res, 'Related record not found', 400, 'FOREIGN_KEY_ERROR');
    }
    case 'P2014': {
      // Required relation violation
      return sendError(res, 'Required relation missing', 400, 'RELATION_ERROR');
    }
    default:
      return sendError(res, 'Database error', 500, 'DATABASE_ERROR');
  }
};

// Not found handler for undefined routes
export const notFoundHandler = (req: Request, res: Response): Response => {
  return sendNotFound(res, `Route ${req.method} ${req.path} not found`);
};

// Async handler wrapper to catch async errors
export const asyncHandler = (
  fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>
) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};


