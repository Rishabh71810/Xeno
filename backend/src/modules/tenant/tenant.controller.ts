import { Request, Response } from 'express';
import { asyncHandler } from '../../middleware/errorHandler.middleware.js';
import {
  sendSuccess,
  sendCreated,
  sendPaginatedSuccess,
  sendBadRequest,
} from '../../utils/apiResponse.js';
import * as tenantService from './tenant.service.js';
import {
  updateTenantSchema,
  updateShopifyCredentialsSchema,
  inviteUserSchema,
  updateUserRoleSchema,
  listQuerySchema,
} from './tenant.validation.js';

/**
 * Get current tenant details
 * GET /api/tenants/current
 */
export const getCurrentTenant = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    return sendBadRequest(res, 'User not authenticated');
  }

  const tenant = await tenantService.getCurrentTenant(req.user.tenantId);

  return sendSuccess(res, tenant);
});

/**
 * Get tenant by ID (for admins or own tenant)
 * GET /api/tenants/:id
 */
export const getTenantById = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    return sendBadRequest(res, 'User not authenticated');
  }

  const { id } = req.params;

  // Users can only access their own tenant
  if (req.user.tenantId !== id) {
    return sendBadRequest(res, 'Access denied');
  }

  const tenant = await tenantService.getTenantById(id, true);

  return sendSuccess(res, tenant);
});

/**
 * Update tenant details
 * PATCH /api/tenants/:id
 */
export const updateTenant = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    return sendBadRequest(res, 'User not authenticated');
  }

  const { id } = req.params;

  // Users can only update their own tenant
  if (req.user.tenantId !== id) {
    return sendBadRequest(res, 'Access denied');
  }

  // Validate input
  const validatedData = updateTenantSchema.parse(req.body);

  const tenant = await tenantService.updateTenant(id, validatedData);

  return sendSuccess(res, tenant, 'Tenant updated successfully');
});

/**
 * Update Shopify credentials
 * PUT /api/tenants/:id/shopify-credentials
 */
export const updateShopifyCredentials = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    return sendBadRequest(res, 'User not authenticated');
  }

  const { id } = req.params;

  // Users can only update their own tenant
  if (req.user.tenantId !== id) {
    return sendBadRequest(res, 'Access denied');
  }

  // Validate input
  const validatedData = updateShopifyCredentialsSchema.parse(req.body);

  const result = await tenantService.updateShopifyCredentials(id, validatedData);

  return sendSuccess(res, result, result.message);
});

/**
 * Test Shopify connection
 * POST /api/tenants/:id/test-connection
 */
export const testShopifyConnection = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    return sendBadRequest(res, 'User not authenticated');
  }

  const { id } = req.params;

  // Users can only test their own tenant
  if (req.user.tenantId !== id) {
    return sendBadRequest(res, 'Access denied');
  }

  const result = await tenantService.testShopifyConnection(id);

  return sendSuccess(res, result, result.message);
});

/**
 * Generate webhook secret
 * POST /api/tenants/:id/webhook-secret
 */
export const generateWebhookSecret = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    return sendBadRequest(res, 'User not authenticated');
  }

  const { id } = req.params;

  // Users can only access their own tenant
  if (req.user.tenantId !== id) {
    return sendBadRequest(res, 'Access denied');
  }

  const result = await tenantService.generateWebhookSecret(id);

  return sendSuccess(res, result, 'Webhook secret generated successfully');
});

/**
 * Deactivate tenant
 * POST /api/tenants/:id/deactivate
 */
export const deactivateTenant = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    return sendBadRequest(res, 'User not authenticated');
  }

  const { id } = req.params;

  // Users can only deactivate their own tenant
  if (req.user.tenantId !== id) {
    return sendBadRequest(res, 'Access denied');
  }

  const result = await tenantService.deactivateTenant(id);

  return sendSuccess(res, result, result.message);
});

/**
 * Get tenant statistics
 * GET /api/tenants/:id/stats
 */
export const getTenantStats = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    return sendBadRequest(res, 'User not authenticated');
  }

  const { id } = req.params;

  // Users can only access their own tenant
  if (req.user.tenantId !== id) {
    return sendBadRequest(res, 'Access denied');
  }

  const stats = await tenantService.getTenantStats(id);

  return sendSuccess(res, stats);
});

// ==================== USER MANAGEMENT ====================

/**
 * List users in tenant
 * GET /api/tenants/:id/users
 */
export const listUsers = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    return sendBadRequest(res, 'User not authenticated');
  }

  const { id } = req.params;

  // Users can only access their own tenant
  if (req.user.tenantId !== id) {
    return sendBadRequest(res, 'Access denied');
  }

  // Validate query params
  const { page, limit } = listQuerySchema.parse(req.query);

  const result = await tenantService.listTenantUsers(id, page, limit);

  return sendPaginatedSuccess(
    res,
    result.users,
    { page: result.page, limit, total: result.total },
    'Users retrieved successfully'
  );
});

/**
 * Invite user to tenant
 * POST /api/tenants/:id/users
 */
export const inviteUser = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    return sendBadRequest(res, 'User not authenticated');
  }

  const { id } = req.params;

  // Users can only invite to their own tenant
  if (req.user.tenantId !== id) {
    return sendBadRequest(res, 'Access denied');
  }

  // Validate input
  const validatedData = inviteUserSchema.parse(req.body);

  const user = await tenantService.inviteUser(id, validatedData, req.user.id);

  return sendCreated(res, user, 'User invited successfully');
});

/**
 * Update user role
 * PATCH /api/tenants/:id/users/:userId
 */
export const updateUserRole = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    return sendBadRequest(res, 'User not authenticated');
  }

  const { id, userId } = req.params;

  // Users can only access their own tenant
  if (req.user.tenantId !== id) {
    return sendBadRequest(res, 'Access denied');
  }

  // Validate input
  const validatedData = updateUserRoleSchema.parse(req.body);

  const user = await tenantService.updateUserRole(id, userId, validatedData, req.user.id);

  return sendSuccess(res, user, 'User role updated successfully');
});

/**
 * Remove user from tenant
 * DELETE /api/tenants/:id/users/:userId
 */
export const removeUser = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    return sendBadRequest(res, 'User not authenticated');
  }

  const { id, userId } = req.params;

  // Users can only access their own tenant
  if (req.user.tenantId !== id) {
    return sendBadRequest(res, 'Access denied');
  }

  const result = await tenantService.removeUser(id, userId, req.user.id);

  return sendSuccess(res, result, result.message);
});


