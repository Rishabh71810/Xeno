import bcrypt from 'bcryptjs';
import axios from 'axios';
import { prisma } from '../../config/database.js';
import { env } from '../../config/env.js';
import { encrypt, decrypt, generateToken } from '../../utils/crypto.js';
import { logger } from '../../utils/logger.js';
import {
  UpdateTenantInput,
  UpdateShopifyCredentialsInput,
  InviteUserInput,
  UpdateUserRoleInput,
} from './tenant.validation.js';
import {
  NotFoundError,
  BadRequestError,
  ConflictError,
  ForbiddenError,
} from '../../middleware/errorHandler.middleware.js';

// Tenant response type
export interface TenantResponse {
  id: string;
  name: string;
  shopifyDomain: string;
  isActive: boolean;
  lastSyncAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  _count?: {
    users: number;
    customers: number;
    orders: number;
    products: number;
  };
}

// Tenant with credentials (for admin view)
export interface TenantWithCredentials extends TenantResponse {
  shopifyApiKey: string | null;
  hasAccessToken: boolean;
  hasApiSecret: boolean;
  hasWebhookSecret: boolean;
}

// User response type
export interface TenantUserResponse {
  id: string;
  email: string;
  name: string | null;
  role: string;
  isActive: boolean;
  lastLoginAt: Date | null;
  createdAt: Date;
}

/**
 * Get tenant by ID
 */
export const getTenantById = async (
  tenantId: string,
  includeCredentials: boolean = false
): Promise<TenantResponse | TenantWithCredentials> => {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    include: {
      _count: {
        select: {
          users: true,
          customers: true,
          orders: true,
          products: true,
        },
      },
    },
  });

  if (!tenant) {
    throw new NotFoundError('Tenant not found');
  }

  const baseResponse: TenantResponse = {
    id: tenant.id,
    name: tenant.name,
    shopifyDomain: tenant.shopifyDomain,
    isActive: tenant.isActive,
    lastSyncAt: tenant.lastSyncAt,
    createdAt: tenant.createdAt,
    updatedAt: tenant.updatedAt,
    _count: tenant._count,
  };

  if (includeCredentials) {
    return {
      ...baseResponse,
      shopifyApiKey: tenant.shopifyApiKey,
      hasAccessToken: !!tenant.shopifyAccessToken,
      hasApiSecret: !!tenant.shopifyApiSecret,
      hasWebhookSecret: !!tenant.webhookSecret,
    };
  }

  return baseResponse;
};

/**
 * Get current tenant (for authenticated user)
 */
export const getCurrentTenant = async (
  tenantId: string
): Promise<TenantWithCredentials> => {
  return getTenantById(tenantId, true) as Promise<TenantWithCredentials>;
};

/**
 * Update tenant details
 */
export const updateTenant = async (
  tenantId: string,
  input: UpdateTenantInput
): Promise<TenantResponse> => {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
  });

  if (!tenant) {
    throw new NotFoundError('Tenant not found');
  }

  // Prepare update data
  const updateData: Record<string, unknown> = {};

  if (input.name !== undefined) {
    updateData.name = input.name;
  }

  if (input.shopifyAccessToken !== undefined) {
    updateData.shopifyAccessToken = encrypt(input.shopifyAccessToken);
  }

  if (input.shopifyApiKey !== undefined) {
    updateData.shopifyApiKey = input.shopifyApiKey;
  }

  if (input.shopifyApiSecret !== undefined) {
    updateData.shopifyApiSecret = input.shopifyApiSecret;
  }

  if (input.webhookSecret !== undefined) {
    updateData.webhookSecret = input.webhookSecret;
  }

  const updatedTenant = await prisma.tenant.update({
    where: { id: tenantId },
    data: updateData,
    include: {
      _count: {
        select: {
          users: true,
          customers: true,
          orders: true,
          products: true,
        },
      },
    },
  });

  logger.info(`Tenant updated: ${tenantId}`);

  return {
    id: updatedTenant.id,
    name: updatedTenant.name,
    shopifyDomain: updatedTenant.shopifyDomain,
    isActive: updatedTenant.isActive,
    lastSyncAt: updatedTenant.lastSyncAt,
    createdAt: updatedTenant.createdAt,
    updatedAt: updatedTenant.updatedAt,
    _count: updatedTenant._count,
  };
};

/**
 * Update Shopify credentials
 */
export const updateShopifyCredentials = async (
  tenantId: string,
  input: UpdateShopifyCredentialsInput
): Promise<{ success: boolean; message: string }> => {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
  });

  if (!tenant) {
    throw new NotFoundError('Tenant not found');
  }

  // Check if domain is changing and if new domain is already taken
  if (input.shopifyDomain && input.shopifyDomain !== tenant.shopifyDomain) {
    const existingTenant = await prisma.tenant.findUnique({
      where: { shopifyDomain: input.shopifyDomain },
    });

    if (existingTenant) {
      throw new ConflictError('This Shopify domain is already registered');
    }
  }

  // Encrypt the access token
  const encryptedToken = encrypt(input.shopifyAccessToken);

  await prisma.tenant.update({
    where: { id: tenantId },
    data: {
      ...(input.shopifyDomain && { shopifyDomain: input.shopifyDomain }),
      shopifyAccessToken: encryptedToken,
      ...(input.shopifyApiKey !== undefined && { shopifyApiKey: input.shopifyApiKey }),
      ...(input.shopifyApiSecret !== undefined && { shopifyApiSecret: input.shopifyApiSecret }),
    },
  });

  logger.info(`Shopify credentials updated for tenant: ${tenantId}`);

  return {
    success: true,
    message: 'Shopify credentials updated successfully',
  };
};

/**
 * Test Shopify connection
 */
export const testShopifyConnection = async (
  tenantId: string
): Promise<{
  success: boolean;
  message: string;
  shopInfo?: {
    name: string;
    email: string;
    domain: string;
    plan: string;
    currency: string;
  };
}> => {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
  });

  if (!tenant) {
    throw new NotFoundError('Tenant not found');
  }

  if (!tenant.shopifyAccessToken) {
    throw new BadRequestError('Shopify access token not configured');
  }

  try {
    // Decrypt the access token
    const accessToken = decrypt(tenant.shopifyAccessToken);

    // Call Shopify API to get shop info
    const response = await axios.get(
      `https://${tenant.shopifyDomain}/admin/api/${env.SHOPIFY_API_VERSION}/shop.json`,
      {
        headers: {
          'X-Shopify-Access-Token': accessToken,
          'Content-Type': 'application/json',
        },
        timeout: 10000,
      }
    );

    const shop = response.data.shop;

    logger.info(`Shopify connection test successful for tenant: ${tenantId}`);

    return {
      success: true,
      message: 'Shopify connection successful',
      shopInfo: {
        name: shop.name,
        email: shop.email,
        domain: shop.domain,
        plan: shop.plan_display_name || shop.plan_name,
        currency: shop.currency,
      },
    };
  } catch (error: unknown) {
    const axiosError = error as { response?: { status: number; data?: { errors?: string } }; message?: string };
    logger.error(`Shopify connection test failed for tenant: ${tenantId}`, error);

    if (axiosError.response?.status === 401) {
      throw new BadRequestError('Invalid Shopify access token. Please update your credentials.');
    }

    if (axiosError.response?.status === 404) {
      throw new BadRequestError('Shopify store not found. Please check your domain.');
    }

    throw new BadRequestError(
      `Failed to connect to Shopify: ${axiosError.response?.data?.errors || axiosError.message || 'Unknown error'}`
    );
  }
};

/**
 * Generate webhook secret for tenant
 */
export const generateWebhookSecret = async (
  tenantId: string
): Promise<{ webhookSecret: string }> => {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
  });

  if (!tenant) {
    throw new NotFoundError('Tenant not found');
  }

  const webhookSecret = generateToken(32);

  await prisma.tenant.update({
    where: { id: tenantId },
    data: { webhookSecret },
  });

  logger.info(`Webhook secret generated for tenant: ${tenantId}`);

  return { webhookSecret };
};

/**
 * Deactivate tenant
 */
export const deactivateTenant = async (
  tenantId: string
): Promise<{ success: boolean; message: string }> => {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
  });

  if (!tenant) {
    throw new NotFoundError('Tenant not found');
  }

  await prisma.tenant.update({
    where: { id: tenantId },
    data: { isActive: false },
  });

  // Also deactivate all users
  await prisma.user.updateMany({
    where: { tenantId },
    data: { isActive: false },
  });

  logger.info(`Tenant deactivated: ${tenantId}`);

  return {
    success: true,
    message: 'Tenant and all users have been deactivated',
  };
};

/**
 * Reactivate tenant
 */
export const reactivateTenant = async (
  tenantId: string
): Promise<{ success: boolean; message: string }> => {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
  });

  if (!tenant) {
    throw new NotFoundError('Tenant not found');
  }

  await prisma.tenant.update({
    where: { id: tenantId },
    data: { isActive: true },
  });

  logger.info(`Tenant reactivated: ${tenantId}`);

  return {
    success: true,
    message: 'Tenant has been reactivated',
  };
};

// ==================== USER MANAGEMENT ====================

/**
 * List users in tenant
 */
export const listTenantUsers = async (
  tenantId: string,
  page: number = 1,
  limit: number = 10
): Promise<{
  users: TenantUserResponse[];
  total: number;
  page: number;
  totalPages: number;
}> => {
  const skip = (page - 1) * limit;

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where: { tenantId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.user.count({ where: { tenantId } }),
  ]);

  return {
    users,
    total,
    page,
    totalPages: Math.ceil(total / limit),
  };
};

/**
 * Invite user to tenant
 */
export const inviteUser = async (
  tenantId: string,
  input: InviteUserInput,
  invitedById: string
): Promise<TenantUserResponse & { temporaryPassword: string }> => {
  // Check if user already exists
  const existingUser = await prisma.user.findUnique({
    where: { email: input.email },
  });

  if (existingUser) {
    throw new ConflictError('User with this email already exists');
  }

  // Generate temporary password
  const temporaryPassword = generateToken(8);
  const passwordHash = await bcrypt.hash(temporaryPassword, 12);

  const user = await prisma.user.create({
    data: {
      email: input.email,
      passwordHash,
      name: input.name || null,
      role: input.role,
      tenantId,
      isActive: true,
    },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      isActive: true,
      lastLoginAt: true,
      createdAt: true,
    },
  });

  logger.info(`User ${input.email} invited to tenant ${tenantId} by user ${invitedById}`);

  // In production, you would send an email with the temporary password
  return {
    ...user,
    temporaryPassword,
  };
};

/**
 * Update user role
 */
export const updateUserRole = async (
  tenantId: string,
  userId: string,
  input: UpdateUserRoleInput,
  updatedById: string
): Promise<TenantUserResponse> => {
  // Verify user belongs to tenant
  const user = await prisma.user.findFirst({
    where: { id: userId, tenantId },
  });

  if (!user) {
    throw new NotFoundError('User not found in this tenant');
  }

  // Prevent self-demotion from ADMIN
  if (userId === updatedById && user.role === 'ADMIN' && input.role !== 'ADMIN') {
    throw new ForbiddenError('You cannot demote yourself from ADMIN role');
  }

  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: { role: input.role },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      isActive: true,
      lastLoginAt: true,
      createdAt: true,
    },
  });

  logger.info(`User ${userId} role updated to ${input.role} by ${updatedById}`);

  return updatedUser;
};

/**
 * Remove user from tenant
 */
export const removeUser = async (
  tenantId: string,
  userId: string,
  removedById: string
): Promise<{ success: boolean; message: string }> => {
  // Verify user belongs to tenant
  const user = await prisma.user.findFirst({
    where: { id: userId, tenantId },
  });

  if (!user) {
    throw new NotFoundError('User not found in this tenant');
  }

  // Prevent self-removal
  if (userId === removedById) {
    throw new ForbiddenError('You cannot remove yourself');
  }

  // Check if this is the last admin
  if (user.role === 'ADMIN') {
    const adminCount = await prisma.user.count({
      where: { tenantId, role: 'ADMIN', isActive: true },
    });

    if (adminCount <= 1) {
      throw new ForbiddenError('Cannot remove the last admin. Promote another user first.');
    }
  }

  // Soft delete - deactivate instead of delete
  await prisma.user.update({
    where: { id: userId },
    data: { isActive: false },
  });

  logger.info(`User ${userId} removed from tenant ${tenantId} by ${removedById}`);

  return {
    success: true,
    message: 'User has been removed from the tenant',
  };
};

/**
 * Get tenant statistics
 */
export const getTenantStats = async (
  tenantId: string
): Promise<{
  totalCustomers: number;
  totalOrders: number;
  totalProducts: number;
  totalRevenue: number;
  totalUsers: number;
  lastSyncAt: Date | null;
}> => {
  const [counts, revenueResult, tenant] = await Promise.all([
    prisma.$transaction([
      prisma.customer.count({ where: { tenantId } }),
      prisma.order.count({ where: { tenantId } }),
      prisma.product.count({ where: { tenantId } }),
      prisma.user.count({ where: { tenantId, isActive: true } }),
    ]),
    prisma.order.aggregate({
      where: { tenantId },
      _sum: { totalPrice: true },
    }),
    prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { lastSyncAt: true },
    }),
  ]);

  return {
    totalCustomers: counts[0],
    totalOrders: counts[1],
    totalProducts: counts[2],
    totalUsers: counts[3],
    totalRevenue: revenueResult._sum.totalPrice?.toNumber() || 0,
    lastSyncAt: tenant?.lastSyncAt || null,
  };
};

