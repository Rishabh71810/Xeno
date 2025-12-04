import { Router } from 'express';
import { authenticate } from '../../middleware/index.js';
import * as productController from './product.controller.js';

const router = Router();

// All product routes require authentication
router.use(authenticate);

/**
 * @route   GET /api/products/vendors
 * @desc    Get list of product vendors for filtering
 * @access  Private
 */
router.get('/vendors', productController.getVendors);

/**
 * @route   GET /api/products/types
 * @desc    Get list of product types for filtering
 * @access  Private
 */
router.get('/types', productController.getProductTypes);

/**
 * @route   GET /api/products
 * @desc    List products with filters and pagination
 * @access  Private
 * @query   {
 *            page?: number,
 *            limit?: number,
 *            sortBy?: string,
 *            sortOrder?: 'asc' | 'desc',
 *            search?: string,
 *            status?: string,
 *            vendor?: string,
 *            productType?: string,
 *            minPrice?: number,
 *            maxPrice?: number,
 *            inStock?: boolean
 *          }
 */
router.get('/', productController.listProducts);

/**
 * @route   GET /api/products/:id
 * @desc    Get product by ID
 * @access  Private
 */
router.get('/:id', productController.getProduct);

export default router;
