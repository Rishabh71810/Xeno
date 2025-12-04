import { Router } from 'express';
import { authenticate } from '../../middleware/index.js';
import * as orderController from './order.controller.js';

const router = Router();

// All order routes require authentication
router.use(authenticate);

/**
 * @route   GET /api/orders
 * @desc    List orders with filters and pagination
 * @access  Private
 * @query   {
 *            page?: number,
 *            limit?: number,
 *            sortBy?: string,
 *            sortOrder?: 'asc' | 'desc',
 *            search?: string,
 *            financialStatus?: string,
 *            fulfillmentStatus?: string,
 *            startDate?: string (ISO date),
 *            endDate?: string (ISO date),
 *            minTotal?: number,
 *            maxTotal?: number,
 *            customerId?: string
 *          }
 */
router.get('/', orderController.listOrders);

/**
 * @route   GET /api/orders/:id
 * @desc    Get order by ID with items and customer
 * @access  Private
 */
router.get('/:id', orderController.getOrder);

/**
 * @route   GET /api/orders/:id/items
 * @desc    Get order line items
 * @access  Private
 */
router.get('/:id/items', orderController.getOrderItems);

export default router;
