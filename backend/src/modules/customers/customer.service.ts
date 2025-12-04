import { prisma } from '../../config/database.js';
import { Prisma } from '@prisma/client';

export interface CustomerFilters {
  search?: string;
  acceptsMarketing?: boolean;
  country?: string;
  minSpent?: number;
  maxSpent?: number;
  minOrders?: number;
}

export interface PaginationOptions {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

/**
 * Get customers with filters and pagination
 */
export const getCustomers = async (
  tenantId: string,
  filters: CustomerFilters = {},
  pagination: PaginationOptions = { page: 1, limit: 10 }
) => {
  const { page, limit, sortBy = 'createdAt', sortOrder = 'desc' } = pagination;
  const skip = (page - 1) * limit;

  // Build where clause
  const where: Prisma.CustomerWhereInput = {
    tenantId,
  };

  if (filters.search) {
    where.OR = [
      { email: { contains: filters.search, mode: 'insensitive' } },
      { firstName: { contains: filters.search, mode: 'insensitive' } },
      { lastName: { contains: filters.search, mode: 'insensitive' } },
    ];
  }

  if (filters.acceptsMarketing !== undefined) {
    where.acceptsMarketing = filters.acceptsMarketing;
  }

  if (filters.country) {
    where.defaultAddressCountry = filters.country;
  }

  if (filters.minSpent !== undefined) {
    where.totalSpent = { ...where.totalSpent as Prisma.DecimalFilter, gte: filters.minSpent };
  }

  if (filters.maxSpent !== undefined) {
    where.totalSpent = { ...where.totalSpent as Prisma.DecimalFilter, lte: filters.maxSpent };
  }

  if (filters.minOrders !== undefined) {
    where.totalOrders = { gte: filters.minOrders };
  }

  // Execute query
  const [customers, total] = await Promise.all([
    prisma.customer.findMany({
      where,
      orderBy: { [sortBy]: sortOrder },
      skip,
      take: limit,
      select: {
        id: true,
        shopifyId: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        totalSpent: true,
        totalOrders: true,
        acceptsMarketing: true,
        defaultAddressCity: true,
        defaultAddressCountry: true,
        tags: true,
        shopifyCreatedAt: true,
        createdAt: true,
        updatedAt: true,
      },
    }),
    prisma.customer.count({ where }),
  ]);

  return {
    customers,
    total,
    page,
    totalPages: Math.ceil(total / limit),
  };
};

/**
 * Get customer by ID
 */
export const getCustomerById = async (tenantId: string, customerId: string) => {
  const customer = await prisma.customer.findFirst({
    where: { id: customerId, tenantId },
    include: {
      orders: {
        orderBy: { shopifyCreatedAt: 'desc' },
        take: 10,
        select: {
          id: true,
          shopifyId: true,
          orderNumber: true,
          name: true,
          totalPrice: true,
          financialStatus: true,
          fulfillmentStatus: true,
          itemCount: true,
          shopifyCreatedAt: true,
        },
      },
    },
  });

  return customer;
};

/**
 * Get customer orders
 */
export const getCustomerOrders = async (
  tenantId: string,
  customerId: string,
  pagination: PaginationOptions = { page: 1, limit: 10 }
) => {
  const { page, limit } = pagination;
  const skip = (page - 1) * limit;

  // Verify customer belongs to tenant
  const customer = await prisma.customer.findFirst({
    where: { id: customerId, tenantId },
    select: { id: true },
  });

  if (!customer) {
    return null;
  }

  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where: { customerId, tenantId },
      orderBy: { shopifyCreatedAt: 'desc' },
      skip,
      take: limit,
      select: {
        id: true,
        shopifyId: true,
        orderNumber: true,
        name: true,
        email: true,
        totalPrice: true,
        subtotalPrice: true,
        totalTax: true,
        currency: true,
        financialStatus: true,
        fulfillmentStatus: true,
        itemCount: true,
        shippingCity: true,
        shippingCountry: true,
        shopifyCreatedAt: true,
      },
    }),
    prisma.order.count({ where: { customerId, tenantId } }),
  ]);

  return {
    orders,
    total,
    page,
    totalPages: Math.ceil(total / limit),
  };
};

