import { Request, Response } from 'express';
import { asyncHandler } from '../../middleware/errorHandler.middleware.js';
import { sendSuccess, sendBadRequest } from '../../utils/apiResponse.js';
import * as insightsService from './insights.service.js';
import { z } from 'zod';

// Query validation schemas
const dateRangeSchema = z.object({
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  groupBy: z.enum(['day', 'week', 'month']).optional().default('day'),
});

const limitSchema = z.object({
  limit: z.string().optional().transform((v) => (v ? parseInt(v, 10) : 5)),
});

const geoSchema = z.object({
  groupBy: z.enum(['country', 'city']).optional().default('country'),
});

/**
 * Get overview statistics
 * GET /api/insights/overview
 */
export const getOverview = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    return sendBadRequest(res, 'User not authenticated');
  }

  const stats = await insightsService.getOverviewStats(req.user.tenantId);

  return sendSuccess(res, stats);
});

/**
 * Get revenue over time
 * GET /api/insights/revenue
 */
export const getRevenue = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    return sendBadRequest(res, 'User not authenticated');
  }

  const { startDate, endDate, groupBy } = dateRangeSchema.parse(req.query);

  const data = await insightsService.getRevenueOverTime(
    req.user.tenantId,
    startDate,
    endDate,
    groupBy
  );

  return sendSuccess(res, data);
});

/**
 * Get orders by date
 * GET /api/insights/orders
 */
export const getOrdersByDate = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    return sendBadRequest(res, 'User not authenticated');
  }

  const { startDate, endDate } = dateRangeSchema.parse(req.query);

  const data = await insightsService.getOrdersByDate(
    req.user.tenantId,
    startDate,
    endDate
  );

  return sendSuccess(res, data);
});

/**
 * Get top customers by spend
 * GET /api/insights/top-customers
 */
export const getTopCustomers = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    return sendBadRequest(res, 'User not authenticated');
  }

  const { limit } = limitSchema.parse(req.query);

  const data = await insightsService.getTopCustomers(req.user.tenantId, limit);

  return sendSuccess(res, data);
});

/**
 * Get top selling products
 * GET /api/insights/top-products
 */
export const getTopProducts = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    return sendBadRequest(res, 'User not authenticated');
  }

  const { limit } = limitSchema.parse(req.query);

  const data = await insightsService.getTopProducts(req.user.tenantId, limit);

  return sendSuccess(res, data);
});

/**
 * Get customer growth over time
 * GET /api/insights/customer-growth
 */
export const getCustomerGrowth = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    return sendBadRequest(res, 'User not authenticated');
  }

  const { startDate, endDate } = dateRangeSchema.parse(req.query);

  const data = await insightsService.getCustomerGrowth(
    req.user.tenantId,
    startDate,
    endDate
  );

  return sendSuccess(res, data);
});

/**
 * Get order status distribution
 * GET /api/insights/order-status
 */
export const getOrderStatus = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    return sendBadRequest(res, 'User not authenticated');
  }

  const data = await insightsService.getOrderStatusDistribution(req.user.tenantId);

  return sendSuccess(res, data);
});

/**
 * Get geographic distribution
 * GET /api/insights/geographic
 */
export const getGeographic = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    return sendBadRequest(res, 'User not authenticated');
  }

  const { groupBy } = geoSchema.parse(req.query);

  const data = await insightsService.getGeographicDistribution(
    req.user.tenantId,
    groupBy
  );

  return sendSuccess(res, data);
});

/**
 * Get recent activity feed
 * GET /api/insights/activity
 */
export const getRecentActivity = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    return sendBadRequest(res, 'User not authenticated');
  }

  const { limit } = limitSchema.parse(req.query);

  const data = await insightsService.getRecentActivity(req.user.tenantId, limit);

  return sendSuccess(res, data);
});

/**
 * Get sales summary with comparisons
 * GET /api/insights/sales-summary
 */
export const getSalesSummary = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    return sendBadRequest(res, 'User not authenticated');
  }

  const data = await insightsService.getSalesSummary(req.user.tenantId);

  return sendSuccess(res, data);
});

/**
 * Get all dashboard data in one call
 * GET /api/insights/dashboard
 */
export const getDashboard = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    return sendBadRequest(res, 'User not authenticated');
  }

  const tenantId = req.user.tenantId;

  // Get last 30 days by default
  const endDate = new Date().toISOString();
  const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const [
    overview,
    salesSummary,
    revenueData,
    topCustomers,
    topProducts,
    orderStatus,
    geographic,
    recentActivity,
  ] = await Promise.all([
    insightsService.getOverviewStats(tenantId),
    insightsService.getSalesSummary(tenantId),
    insightsService.getRevenueOverTime(tenantId, startDate, endDate, 'day'),
    insightsService.getTopCustomers(tenantId, 5),
    insightsService.getTopProducts(tenantId, 5),
    insightsService.getOrderStatusDistribution(tenantId),
    insightsService.getGeographicDistribution(tenantId, 'country'),
    insightsService.getRecentActivity(tenantId, 10),
  ]);

  return sendSuccess(res, {
    overview,
    salesSummary,
    revenueData,
    topCustomers,
    topProducts,
    orderStatus,
    geographic,
    recentActivity,
  });
});

