import { prisma } from '../../config/database.js';
import { Prisma } from '@prisma/client';

export interface OrderFilters {
  search?: string;
  financialStatus?: string;
  fulfillmentStatus?: string;
  startDate?: string;
  endDate?: string;
  minTotal?: number;
  maxTotal?: number;
  customerId?: string;
}

export interface PaginationOptions {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

/**
 * Get orders with filters and pagination
 */
export const getOrders = async (
  tenantId: string,
  filters: OrderFilters = {},
  pagination: PaginationOptions = { page: 1, limit: 10 }
) => {
  const { page, limit, sortBy = 'shopifyCreatedAt', sortOrder = 'desc' } = pagination;
  const skip = (page - 1) * limit;

  // Build where clause
  const where: Prisma.OrderWhereInput = {
    tenantId,
  };

  if (filters.search) {
    where.OR = [
      { name: { contains: filters.search, mode: 'insensitive' } },
      { email: { contains: filters.search, mode: 'insensitive' } },
      { orderNumber: isNaN(parseInt(filters.search)) ? undefined : parseInt(filters.search) },
    ].filter(Boolean) as Prisma.OrderWhereInput[];
  }

  if (filters.financialStatus) {
    where.financialStatus = filters.financialStatus;
  }

  if (filters.fulfillmentStatus) {
    where.fulfillmentStatus = filters.fulfillmentStatus;
  }

  if (filters.startDate) {
    where.shopifyCreatedAt = {
      ...where.shopifyCreatedAt as Prisma.DateTimeFilter,
      gte: new Date(filters.startDate),
    };
  }

  if (filters.endDate) {
    where.shopifyCreatedAt = {
      ...where.shopifyCreatedAt as Prisma.DateTimeFilter,
      lte: new Date(filters.endDate),
    };
  }

  if (filters.minTotal !== undefined) {
    where.totalPrice = { ...where.totalPrice as Prisma.DecimalFilter, gte: filters.minTotal };
  }

  if (filters.maxTotal !== undefined) {
    where.totalPrice = { ...where.totalPrice as Prisma.DecimalFilter, lte: filters.maxTotal };
  }

  if (filters.customerId) {
    where.customerId = filters.customerId;
  }

  // Execute query
  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where,
      orderBy: { [sortBy]: sortOrder },
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
        totalDiscounts: true,
        currency: true,
        financialStatus: true,
        fulfillmentStatus: true,
        itemCount: true,
        shippingCity: true,
        shippingCountry: true,
        shopifyCreatedAt: true,
        createdAt: true,
        customer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    }),
    prisma.order.count({ where }),
  ]);

  return {
    orders,
    total,
    page,
    totalPages: Math.ceil(total / limit),
  };
};

/**
 * Get order by ID with items
 */
export const getOrderById = async (tenantId: string, orderId: string) => {
  const order = await prisma.order.findFirst({
    where: { id: orderId, tenantId },
    include: {
      customer: {
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          phone: true,
        },
      },
      items: {
        select: {
          id: true,
          title: true,
          variantTitle: true,
          sku: true,
          quantity: true,
          price: true,
          totalDiscount: true,
          fulfillmentStatus: true,
          product: {
            select: {
              id: true,
              title: true,
              imageUrl: true,
            },
          },
        },
      },
    },
  });

  return order;
};

/**
 * Get order items
 */
export const getOrderItems = async (tenantId: string, orderId: string) => {
  // Verify order belongs to tenant
  const order = await prisma.order.findFirst({
    where: { id: orderId, tenantId },
    select: { id: true },
  });

  if (!order) {
    return null;
  }

  const items = await prisma.orderItem.findMany({
    where: { orderId },
    select: {
      id: true,
      title: true,
      variantTitle: true,
      sku: true,
      quantity: true,
      price: true,
      totalDiscount: true,
      fulfillmentStatus: true,
      product: {
        select: {
          id: true,
          title: true,
          imageUrl: true,
          shopifyId: true,
        },
      },
    },
  });

  return items;
};

/**
 * Get order statistics for date range
 */
export const getOrderStats = async (
  tenantId: string,
  startDate?: string,
  endDate?: string
) => {
  const where: Prisma.OrderWhereInput = { tenantId };

  if (startDate) {
    where.shopifyCreatedAt = {
      ...where.shopifyCreatedAt as Prisma.DateTimeFilter,
      gte: new Date(startDate),
    };
  }

  if (endDate) {
    where.shopifyCreatedAt = {
      ...where.shopifyCreatedAt as Prisma.DateTimeFilter,
      lte: new Date(endDate),
    };
  }

  const [totalOrders, revenue, avgOrderValue] = await Promise.all([
    prisma.order.count({ where }),
    prisma.order.aggregate({
      where,
      _sum: { totalPrice: true },
    }),
    prisma.order.aggregate({
      where,
      _avg: { totalPrice: true },
    }),
  ]);

  return {
    totalOrders,
    totalRevenue: revenue._sum.totalPrice?.toNumber() || 0,
    averageOrderValue: avgOrderValue._avg.totalPrice?.toNumber() || 0,
  };
};


