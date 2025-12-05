import { Request, Response } from 'express';
import { asyncHandler } from '../../middleware/errorHandler.middleware.js';
import {
  sendSuccess,
  sendPaginatedSuccess,
  sendNotFound,
  sendBadRequest,
} from '../../utils/apiResponse.js';
import * as customerService from './customer.service.js';
import { z } from 'zod';

// Query validation
const listQuerySchema = z.object({
  page: z.string().optional().transform((v) => (v ? parseInt(v, 10) : 1)),
  limit: z.string().optional().transform((v) => (v ? Math.min(parseInt(v, 10) || 10, 100) : 10)),
  sortBy: z.string().optional().default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
  search: z.string().optional(),
  acceptsMarketing: z.string().optional().transform((v) => v === 'true' ? true : v === 'false' ? false : undefined),
  country: z.string().optional(),
  minSpent: z.string().optional().transform((v) => v ? parseFloat(v) : undefined),
  maxSpent: z.string().optional().transform((v) => v ? parseFloat(v) : undefined),
  minOrders: z.string().optional().transform((v) => v ? parseInt(v, 10) : undefined),
});

/**
 * List customers
 * GET /api/customers
 */
export const listCustomers = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    return sendBadRequest(res, 'User not authenticated');
  }

  const query = listQuerySchema.parse(req.query);

  const result = await customerService.getCustomers(
    req.user.tenantId,
    {
      search: query.search,
      acceptsMarketing: query.acceptsMarketing,
      country: query.country,
      minSpent: query.minSpent,
      maxSpent: query.maxSpent,
      minOrders: query.minOrders,
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
    result.customers,
    { page: result.page, limit: query.limit, total: result.total },
    'Customers retrieved successfully'
  );
});

/**
 * Get customer by ID
 * GET /api/customers/:id
 */
export const getCustomer = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    return sendBadRequest(res, 'User not authenticated');
  }

  const customer = await customerService.getCustomerById(
    req.user.tenantId,
    req.params.id
  );

  if (!customer) {
    return sendNotFound(res, 'Customer not found');
  }

  return sendSuccess(res, customer);
});

/**
 * Get customer orders
 * GET /api/customers/:id/orders
 */
export const getCustomerOrders = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    return sendBadRequest(res, 'User not authenticated');
  }

  const query = listQuerySchema.parse(req.query);

  const result = await customerService.getCustomerOrders(
    req.user.tenantId,
    req.params.id,
    { page: query.page, limit: query.limit }
  );

  if (!result) {
    return sendNotFound(res, 'Customer not found');
  }

  return sendPaginatedSuccess(
    res,
    result.orders,
    { page: result.page, limit: query.limit, total: result.total },
    'Customer orders retrieved successfully'
  );
});



