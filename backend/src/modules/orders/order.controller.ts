import { Request, Response } from 'express';
import { asyncHandler } from '../../middleware/errorHandler.middleware.js';
import {
  sendSuccess,
  sendPaginatedSuccess,
  sendNotFound,
  sendBadRequest,
} from '../../utils/apiResponse.js';
import * as orderService from './order.service.js';
import { z } from 'zod';

// Query validation
const listQuerySchema = z.object({
  page: z.string().optional().transform((v) => (v ? parseInt(v, 10) : 1)),
  limit: z.string().optional().transform((v) => (v ? Math.min(parseInt(v, 10) || 10, 100) : 10)),
  sortBy: z.string().optional().default('shopifyCreatedAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
  search: z.string().optional(),
  financialStatus: z.string().optional(),
  fulfillmentStatus: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  minTotal: z.string().optional().transform((v) => v ? parseFloat(v) : undefined),
  maxTotal: z.string().optional().transform((v) => v ? parseFloat(v) : undefined),
  customerId: z.string().optional(),
});

/**
 * List orders
 * GET /api/orders
 */
export const listOrders = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    return sendBadRequest(res, 'User not authenticated');
  }

  const query = listQuerySchema.parse(req.query);

  const result = await orderService.getOrders(
    req.user.tenantId,
    {
      search: query.search,
      financialStatus: query.financialStatus,
      fulfillmentStatus: query.fulfillmentStatus,
      startDate: query.startDate,
      endDate: query.endDate,
      minTotal: query.minTotal,
      maxTotal: query.maxTotal,
      customerId: query.customerId,
    },
    {
      page: query.page,
      limit: query.limit,
      sortBy: query.sortBy,
      sortOrder: query.sortOrder,
    }
  );

  return sendPaginatedSuccess(
    res,
    result.orders,
    { page: result.page, limit: query.limit, total: result.total },
    'Orders retrieved successfully'
  );
});

/**
 * Get order by ID
 * GET /api/orders/:id
 */
export const getOrder = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    return sendBadRequest(res, 'User not authenticated');
  }

  const order = await orderService.getOrderById(
    req.user.tenantId,
    req.params.id
  );

  if (!order) {
    return sendNotFound(res, 'Order not found');
  }

  return sendSuccess(res, order);
});

/**
 * Get order items
 * GET /api/orders/:id/items
 */
export const getOrderItems = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    return sendBadRequest(res, 'User not authenticated');
  }

  const items = await orderService.getOrderItems(
    req.user.tenantId,
    req.params.id
  );

  if (!items) {
    return sendNotFound(res, 'Order not found');
  }

  return sendSuccess(res, items);
});


