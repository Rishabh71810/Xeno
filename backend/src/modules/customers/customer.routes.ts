import { Router } from 'express';
import { authenticate } from '../../middleware/index.js';
import * as customerController from './customer.controller.js';

const router = Router();

// All customer routes require authentication
router.use(authenticate);

/**
 * @route   GET /api/customers
 * @desc    List customers with filters and pagination
 * @access  Private
 * @query   {
 *            page?: number,
 *            limit?: number,
 *            sortBy?: string,
 *            sortOrder?: 'asc' | 'desc',
 *            search?: string,
 *            acceptsMarketing?: boolean,
 *            country?: string,
 *            minSpent?: number,
 *            maxSpent?: number,
 *            minOrders?: number
 *          }
 */
router.get('/', customerController.listCustomers);

/**
 * @route   GET /api/customers/:id
 * @desc    Get customer by ID with recent orders
 * @access  Private
 */
router.get('/:id', customerController.getCustomer);

/**
 * @route   GET /api/customers/:id/orders
 * @desc    Get customer's orders
 * @access  Private
 * @query   { page?: number, limit?: number }
 */
router.get('/:id/orders', customerController.getCustomerOrders);

export default router;
