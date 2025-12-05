import { Response } from 'express';

// Standard API Response interface
export interface ApiResponse<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    totalPages?: number;
  };
}

// Pagination interface
export interface PaginationParams {
  page: number;
  limit: number;
  total: number;
}

// Success response helper
export const sendSuccess = <T>(
  res: Response,
  data: T,
  message?: string,
  statusCode: number = 200
): Response => {
  const response: ApiResponse<T> = {
    success: true,
    message,
    data,
  };
  return res.status(statusCode).json(response);
};

// Paginated success response
export const sendPaginatedSuccess = <T>(
  res: Response,
  data: T[],
  pagination: PaginationParams,
  message?: string
): Response => {
  const response: ApiResponse<T[]> = {
    success: true,
    message,
    data,
    meta: {
      page: pagination.page,
      limit: pagination.limit,
      total: pagination.total,
      totalPages: Math.ceil(pagination.total / pagination.limit),
    },
  };
  return res.status(200).json(response);
};

// Error response helper
export const sendError = (
  res: Response,
  message: string,
  statusCode: number = 500,
  errorCode?: string,
  details?: unknown
): Response => {
  const response: ApiResponse = {
    success: false,
    error: {
      code: errorCode || getErrorCode(statusCode),
      message,
      details,
    },
  };
  return res.status(statusCode).json(response);
};

// Created response (201)
export const sendCreated = <T>(
  res: Response,
  data: T,
  message: string = 'Resource created successfully'
): Response => {
  return sendSuccess(res, data, message, 201);
};

// No content response (204)
export const sendNoContent = (res: Response): Response => {
  return res.status(204).send();
};

// Bad request (400)
export const sendBadRequest = (
  res: Response,
  message: string = 'Bad request',
  details?: unknown
): Response => {
  return sendError(res, message, 400, 'BAD_REQUEST', details);
};

// Unauthorized (401)
export const sendUnauthorized = (
  res: Response,
  message: string = 'Unauthorized'
): Response => {
  return sendError(res, message, 401, 'UNAUTHORIZED');
};

// Forbidden (403)
export const sendForbidden = (
  res: Response,
  message: string = 'Forbidden'
): Response => {
  return sendError(res, message, 403, 'FORBIDDEN');
};

// Not found (404)
export const sendNotFound = (
  res: Response,
  message: string = 'Resource not found'
): Response => {
  return sendError(res, message, 404, 'NOT_FOUND');
};

// Conflict (409)
export const sendConflict = (
  res: Response,
  message: string = 'Resource already exists'
): Response => {
  return sendError(res, message, 409, 'CONFLICT');
};

// Validation error (422)
export const sendValidationError = (
  res: Response,
  errors: unknown
): Response => {
  return sendError(res, 'Validation failed', 422, 'VALIDATION_ERROR', errors);
};

// Internal server error (500)
export const sendInternalError = (
  res: Response,
  message: string = 'Internal server error'
): Response => {
  return sendError(res, message, 500, 'INTERNAL_ERROR');
};

// Get error code from status code
const getErrorCode = (statusCode: number): string => {
  const errorCodes: Record<number, string> = {
    400: 'BAD_REQUEST',
    401: 'UNAUTHORIZED',
    403: 'FORBIDDEN',
    404: 'NOT_FOUND',
    409: 'CONFLICT',
    422: 'VALIDATION_ERROR',
    429: 'RATE_LIMITED',
    500: 'INTERNAL_ERROR',
    502: 'BAD_GATEWAY',
    503: 'SERVICE_UNAVAILABLE',
  };
  return errorCodes[statusCode] || 'ERROR';
};



