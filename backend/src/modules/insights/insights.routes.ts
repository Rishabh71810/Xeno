import { Router } from 'express';
import { authenticate, insightsRateLimiter } from '../../middleware/index.js';
import * as insightsController from './insights.controller.js';

const router = Router();

// All insights routes require authentication and have rate limiting
router.use(authenticate);
router.use(insightsRateLimiter);

/**
 * @route   GET /api/insights/dashboard
 * @desc    Get all dashboard data in one call (optimized)
 * @access  Private
 */
router.get('/dashboard', insightsController.getDashboard);

/**
 * @route   GET /api/insights/overview
 * @desc    Get overview statistics (totals)
 * @access  Private
 */
router.get('/overview', insightsController.getOverview);

/**
 * @route   GET /api/insights/sales-summary
 * @desc    Get sales summary with period comparisons
 * @access  Private
 */
router.get('/sales-summary', insightsController.getSalesSummary);

/**
 * @route   GET /api/insights/revenue
 * @desc    Get revenue over time
 * @access  Private
 * @query   { startDate?: string, endDate?: string, groupBy?: 'day'|'week'|'month' }
 */
router.get('/revenue', insightsController.getRevenue);

/**
 * @route   GET /api/insights/orders
 * @desc    Get orders by date with status breakdown
 * @access  Private
 * @query   { startDate?: string, endDate?: string }
 */
router.get('/orders', insightsController.getOrdersByDate);

/**
 * @route   GET /api/insights/top-customers
 * @desc    Get top customers by total spend
 * @access  Private
 * @query   { limit?: number }
 */
router.get('/top-customers', insightsController.getTopCustomers);

/**
 * @route   GET /api/insights/top-products
 * @desc    Get top selling products
 * @access  Private
 * @query   { limit?: number }
 */
router.get('/top-products', insightsController.getTopProducts);

/**
 * @route   GET /api/insights/customer-growth
 * @desc    Get customer growth over time
 * @access  Private
 * @query   { startDate?: string, endDate?: string }
 */
router.get('/customer-growth', insightsController.getCustomerGrowth);

/**
 * @route   GET /api/insights/order-status
 * @desc    Get order status distribution
 * @access  Private
 */
router.get('/order-status', insightsController.getOrderStatus);

/**
 * @route   GET /api/insights/geographic
 * @desc    Get sales by geographic location
 * @access  Private
 * @query   { groupBy?: 'country'|'city' }
 */
router.get('/geographic', insightsController.getGeographic);

/**
 * @route   GET /api/insights/activity
 * @desc    Get recent activity feed
 * @access  Private
 * @query   { limit?: number }
 */
router.get('/activity', insightsController.getRecentActivity);

export default router;
