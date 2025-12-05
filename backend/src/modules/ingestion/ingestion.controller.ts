import { Request, Response } from 'express';
import { asyncHandler } from '../../middleware/errorHandler.middleware.js';
import {
  sendSuccess,
  sendBadRequest,
  sendPaginatedSuccess,
} from '../../utils/apiResponse.js';
import * as ingestionService from './ingestion.service.js';
import { z } from 'zod';

// Query validation
const paginationSchema = z.object({
  page: z.string().optional().transform((v) => (v ? parseInt(v, 10) : 1)),
  limit: z.string().optional().transform((v) => (v ? parseInt(v, 10) : 20)),
});

const syncOptionsSchema = z.object({
  fullSync: z.boolean().optional().default(false),
});

/**
 * Trigger full sync
 * POST /api/ingestion/sync
 */
export const triggerFullSync = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    return sendBadRequest(res, 'User not authenticated');
  }

  const { fullSync } = syncOptionsSchema.parse(req.body);

  const result = await ingestionService.syncAll(req.user.tenantId, {
    fullSync,
    triggeredBy: req.user.id,
  });

  return sendSuccess(res, result, 'Full sync completed');
});

/**
 * Sync customers only
 * POST /api/ingestion/sync/customers
 */
export const syncCustomers = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    return sendBadRequest(res, 'User not authenticated');
  }

  const { fullSync } = syncOptionsSchema.parse(req.body);

  const result = await ingestionService.syncCustomers(req.user.tenantId, {
    fullSync,
    triggeredBy: req.user.id,
  });

  return sendSuccess(res, result, result.message);
});

/**
 * Sync products only
 * POST /api/ingestion/sync/products
 */
export const syncProducts = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    return sendBadRequest(res, 'User not authenticated');
  }

  const { fullSync } = syncOptionsSchema.parse(req.body);

  const result = await ingestionService.syncProducts(req.user.tenantId, {
    fullSync,
    triggeredBy: req.user.id,
  });

  return sendSuccess(res, result, result.message);
});

/**
 * Sync orders only
 * POST /api/ingestion/sync/orders
 */
export const syncOrders = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    return sendBadRequest(res, 'User not authenticated');
  }

  const { fullSync } = syncOptionsSchema.parse(req.body);

  const result = await ingestionService.syncOrders(req.user.tenantId, {
    fullSync,
    triggeredBy: req.user.id,
  });

  return sendSuccess(res, result, result.message);
});

/**
 * Get sync status
 * GET /api/ingestion/status
 */
export const getSyncStatus = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    return sendBadRequest(res, 'User not authenticated');
  }

  const status = await ingestionService.getSyncStatus(req.user.tenantId);

  return sendSuccess(res, status);
});

/**
 * Get sync logs
 * GET /api/ingestion/logs
 */
export const getSyncLogs = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    return sendBadRequest(res, 'User not authenticated');
  }

  const { page, limit } = paginationSchema.parse(req.query);

  const result = await ingestionService.getSyncLogs(req.user.tenantId, page, limit);

  return sendPaginatedSuccess(
    res,
    result.logs,
    { page: result.page, limit, total: result.total },
    'Sync logs retrieved successfully'
  );
});


