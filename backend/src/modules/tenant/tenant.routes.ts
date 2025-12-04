import { Router } from 'express';
import { authenticate, authorize } from '../../middleware/index.js';
import * as tenantController from './tenant.controller.js';

const router = Router();

// All tenant routes require authentication
router.use(authenticate);

// ==================== TENANT MANAGEMENT ====================

/**
 * @route   GET /api/tenants/current
 * @desc    Get current user's tenant details
 * @access  Private
 */
router.get('/current', tenantController.getCurrentTenant);

/**
 * @route   GET /api/tenants/:id
 * @desc    Get tenant by ID
 * @access  Private (own tenant only)
 */
router.get('/:id', tenantController.getTenantById);

/**
 * @route   PATCH /api/tenants/:id
 * @desc    Update tenant details
 * @access  Private (ADMIN, MANAGER)
 */
router.patch('/:id', authorize('ADMIN', 'MANAGER'), tenantController.updateTenant);

/**
 * @route   PUT /api/tenants/:id/shopify-credentials
 * @desc    Update Shopify API credentials
 * @access  Private (ADMIN only)
 */
router.put(
  '/:id/shopify-credentials',
  authorize('ADMIN'),
  tenantController.updateShopifyCredentials
);

/**
 * @route   POST /api/tenants/:id/test-connection
 * @desc    Test Shopify API connection
 * @access  Private (ADMIN, MANAGER)
 */
router.post(
  '/:id/test-connection',
  authorize('ADMIN', 'MANAGER'),
  tenantController.testShopifyConnection
);

/**
 * @route   POST /api/tenants/:id/webhook-secret
 * @desc    Generate new webhook secret
 * @access  Private (ADMIN only)
 */
router.post(
  '/:id/webhook-secret',
  authorize('ADMIN'),
  tenantController.generateWebhookSecret
);

/**
 * @route   POST /api/tenants/:id/deactivate
 * @desc    Deactivate tenant (soft delete)
 * @access  Private (ADMIN only)
 */
router.post('/:id/deactivate', authorize('ADMIN'), tenantController.deactivateTenant);

/**
 * @route   GET /api/tenants/:id/stats
 * @desc    Get tenant statistics
 * @access  Private
 */
router.get('/:id/stats', tenantController.getTenantStats);

// ==================== USER MANAGEMENT ====================

/**
 * @route   GET /api/tenants/:id/users
 * @desc    List all users in tenant
 * @access  Private (ADMIN, MANAGER)
 */
router.get('/:id/users', authorize('ADMIN', 'MANAGER'), tenantController.listUsers);

/**
 * @route   POST /api/tenants/:id/users
 * @desc    Invite a new user to tenant
 * @access  Private (ADMIN only)
 */
router.post('/:id/users', authorize('ADMIN'), tenantController.inviteUser);

/**
 * @route   PATCH /api/tenants/:id/users/:userId
 * @desc    Update user role
 * @access  Private (ADMIN only)
 */
router.patch('/:id/users/:userId', authorize('ADMIN'), tenantController.updateUserRole);

/**
 * @route   DELETE /api/tenants/:id/users/:userId
 * @desc    Remove user from tenant
 * @access  Private (ADMIN only)
 */
router.delete('/:id/users/:userId', authorize('ADMIN'), tenantController.removeUser);

export default router;
