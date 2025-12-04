import { Router } from 'express';
import { authenticate, authorize, syncRateLimiter } from '../../middleware/index.js';
import * as ingestionController from './ingestion.controller.js';

const router = Router();

// All ingestion routes require authentication
router.use(authenticate);

/**
 * @route   POST /api/ingestion/sync
 * @desc    Trigger full sync (customers, products, orders)
 * @access  Private (ADMIN, MANAGER)
 * @body    { fullSync?: boolean }
 */
router.post(
  '/sync',
  authorize('ADMIN', 'MANAGER'),
  syncRateLimiter,
  ingestionController.triggerFullSync
);

/**
 * @route   POST /api/ingestion/sync/customers
 * @desc    Sync customers only
 * @access  Private (ADMIN, MANAGER)
 * @body    { fullSync?: boolean }
 */
router.post(
  '/sync/customers',
  authorize('ADMIN', 'MANAGER'),
  syncRateLimiter,
  ingestionController.syncCustomers
);

/**
 * @route   POST /api/ingestion/sync/products
 * @desc    Sync products only
 * @access  Private (ADMIN, MANAGER)
 * @body    { fullSync?: boolean }
 */
router.post(
  '/sync/products',
  authorize('ADMIN', 'MANAGER'),
  syncRateLimiter,
  ingestionController.syncProducts
);

/**
 * @route   POST /api/ingestion/sync/orders
 * @desc    Sync orders only
 * @access  Private (ADMIN, MANAGER)
 * @body    { fullSync?: boolean }
 */
router.post(
  '/sync/orders',
  authorize('ADMIN', 'MANAGER'),
  syncRateLimiter,
  ingestionController.syncOrders
);

/**
 * @route   GET /api/ingestion/status
 * @desc    Get sync status and recent logs
 * @access  Private
 */
router.get('/status', ingestionController.getSyncStatus);

/**
 * @route   GET /api/ingestion/logs
 * @desc    Get sync logs with pagination
 * @access  Private
 * @query   { page?: number, limit?: number }
 */
router.get('/logs', ingestionController.getSyncLogs);

export default router;
