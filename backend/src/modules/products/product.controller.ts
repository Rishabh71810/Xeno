import { Request, Response } from 'express';
import { asyncHandler } from '../../middleware/errorHandler.middleware.js';
import {
  sendSuccess,
  sendPaginatedSuccess,
  sendNotFound,
  sendBadRequest,
} from '../../utils/apiResponse.js';
import * as productService from './product.service.js';
import { z } from 'zod';

// Query validation
const listQuerySchema = z.object({
  page: z.string().optional().transform((v) => (v ? parseInt(v, 10) : 1)),
  limit: z.string().optional().transform((v) => (v ? Math.min(parseInt(v, 10) || 10, 100) : 10)),
  sortBy: z.string().optional().default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
  search: z.string().optional(),
  status: z.string().optional(),
  vendor: z.string().optional(),
  productType: z.string().optional(),
  minPrice: z.string().optional().transform((v) => v ? parseFloat(v) : undefined),
  maxPrice: z.string().optional().transform((v) => v ? parseFloat(v) : undefined),
  inStock: z.string().optional().transform((v) => v === 'true' ? true : v === 'false' ? false : undefined),
});

/**
 * List products
 * GET /api/products
 */
export const listProducts = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    return sendBadRequest(res, 'User not authenticated');
  }

  const query = listQuerySchema.parse(req.query);

  const result = await productService.getProducts(
    req.user.tenantId,
    {
      search: query.search,
      status: query.status,
      vendor: query.vendor,
      productType: query.productType,
      minPrice: query.minPrice,
      maxPrice: query.maxPrice,
      inStock: query.inStock,
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
    result.products,
    { page: result.page, limit: query.limit, total: result.total },
    'Products retrieved successfully'
  );
});

/**
 * Get product by ID
 * GET /api/products/:id
 */
export const getProduct = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    return sendBadRequest(res, 'User not authenticated');
  }

  const product = await productService.getProductById(
    req.user.tenantId,
    req.params.id
  );

  if (!product) {
    return sendNotFound(res, 'Product not found');
  }

  return sendSuccess(res, product);
});

/**
 * Get product vendors
 * GET /api/products/vendors
 */
export const getVendors = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    return sendBadRequest(res, 'User not authenticated');
  }

  const vendors = await productService.getProductVendors(req.user.tenantId);

  return sendSuccess(res, vendors);
});

/**
 * Get product types
 * GET /api/products/types
 */
export const getProductTypes = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    return sendBadRequest(res, 'User not authenticated');
  }

  const types = await productService.getProductTypes(req.user.tenantId);

  return sendSuccess(res, types);
});


