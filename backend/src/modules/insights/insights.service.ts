import { prisma } from '../../config/database.js';
import { Prisma } from '@prisma/client';

// ==================== OVERVIEW ====================

export interface OverviewStats {
  totalCustomers: number;
  totalOrders: number;
  totalProducts: number;
  totalRevenue: number;
  averageOrderValue: number;
  totalItemsSold: number;
}

/**
 * Get overview statistics for dashboard
 */
export const getOverviewStats = async (tenantId: string): Promise<OverviewStats> => {
  const [
    totalCustomers,
    totalOrders,
    totalProducts,
    revenueStats,
    itemsSold,
  ] = await Promise.all([
    prisma.customer.count({ where: { tenantId } }),
    prisma.order.count({ where: { tenantId } }),
    prisma.product.count({ where: { tenantId } }),
    prisma.order.aggregate({
      where: { tenantId },
      _sum: { totalPrice: true },
      _avg: { totalPrice: true },
    }),
    prisma.orderItem.aggregate({
      where: { order: { tenantId } },
      _sum: { quantity: true },
    }),
  ]);

  return {
    totalCustomers,
    totalOrders,
    totalProducts,
    totalRevenue: revenueStats._sum.totalPrice?.toNumber() || 0,
    averageOrderValue: revenueStats._avg.totalPrice?.toNumber() || 0,
    totalItemsSold: itemsSold._sum.quantity || 0,
  };
};

// ==================== REVENUE ====================

export interface RevenueDataPoint {
  date: string;
  revenue: number;
  orders: number;
}

/**
 * Get revenue data over time
 */
export const getRevenueOverTime = async (
  tenantId: string,
  startDate?: string,
  endDate?: string,
  groupBy: 'day' | 'week' | 'month' = 'day'
): Promise<RevenueDataPoint[]> => {
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

  // Get all orders in range
  const orders = await prisma.order.findMany({
    where,
    select: {
      totalPrice: true,
      shopifyCreatedAt: true,
    },
    orderBy: { shopifyCreatedAt: 'asc' },
  });

  // Group by date
  const groupedData = new Map<string, { revenue: number; orders: number }>();

  orders.forEach((order) => {
    if (!order.shopifyCreatedAt) return;

    let dateKey: string;
    const date = new Date(order.shopifyCreatedAt);

    switch (groupBy) {
      case 'week':
        // Get start of week (Monday)
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay() + 1);
        dateKey = weekStart.toISOString().split('T')[0];
        break;
      case 'month':
        dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        break;
      default:
        dateKey = date.toISOString().split('T')[0];
    }

    const existing = groupedData.get(dateKey) || { revenue: 0, orders: 0 };
    groupedData.set(dateKey, {
      revenue: existing.revenue + (order.totalPrice?.toNumber() || 0),
      orders: existing.orders + 1,
    });
  });

  return Array.from(groupedData.entries()).map(([date, data]) => ({
    date,
    revenue: Math.round(data.revenue * 100) / 100,
    orders: data.orders,
  }));
};

// ==================== ORDERS BY DATE ====================

export interface OrdersByDateData {
  date: string;
  total: number;
  paid: number;
  pending: number;
  refunded: number;
}

/**
 * Get orders grouped by date with status breakdown
 */
export const getOrdersByDate = async (
  tenantId: string,
  startDate?: string,
  endDate?: string
): Promise<OrdersByDateData[]> => {
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

  const orders = await prisma.order.findMany({
    where,
    select: {
      financialStatus: true,
      shopifyCreatedAt: true,
    },
    orderBy: { shopifyCreatedAt: 'asc' },
  });

  const groupedData = new Map<string, OrdersByDateData>();

  orders.forEach((order) => {
    if (!order.shopifyCreatedAt) return;

    const dateKey = order.shopifyCreatedAt.toISOString().split('T')[0];
    const existing = groupedData.get(dateKey) || {
      date: dateKey,
      total: 0,
      paid: 0,
      pending: 0,
      refunded: 0,
    };

    existing.total++;
    
    switch (order.financialStatus) {
      case 'paid':
        existing.paid++;
        break;
      case 'pending':
        existing.pending++;
        break;
      case 'refunded':
      case 'partially_refunded':
        existing.refunded++;
        break;
    }

    groupedData.set(dateKey, existing);
  });

  return Array.from(groupedData.values());
};

// ==================== TOP CUSTOMERS ====================

export interface TopCustomer {
  id: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  totalSpent: number;
  totalOrders: number;
  averageOrderValue: number;
}

/**
 * Get top customers by spend
 */
export const getTopCustomers = async (
  tenantId: string,
  limit: number = 5
): Promise<TopCustomer[]> => {
  const customers = await prisma.customer.findMany({
    where: { tenantId, totalSpent: { gt: 0 } },
    orderBy: { totalSpent: 'desc' },
    take: limit,
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      totalSpent: true,
      totalOrders: true,
    },
  });

  return customers.map((c) => ({
    id: c.id,
    email: c.email,
    firstName: c.firstName,
    lastName: c.lastName,
    totalSpent: c.totalSpent.toNumber(),
    totalOrders: c.totalOrders,
    averageOrderValue: c.totalOrders > 0 
      ? Math.round((c.totalSpent.toNumber() / c.totalOrders) * 100) / 100 
      : 0,
  }));
};

// ==================== TOP PRODUCTS ====================

export interface TopProduct {
  id: string;
  title: string;
  imageUrl: string | null;
  totalQuantitySold: number;
  totalRevenue: number;
  orderCount: number;
}

/**
 * Get top selling products
 */
export const getTopProducts = async (
  tenantId: string,
  limit: number = 5
): Promise<TopProduct[]> => {
  // Aggregate order items by product
  const productStats = await prisma.orderItem.groupBy({
    by: ['productId'],
    where: {
      order: { tenantId },
      productId: { not: null },
    },
    _sum: {
      quantity: true,
      price: true,
    },
    _count: {
      orderId: true,
    },
    orderBy: {
      _sum: {
        quantity: 'desc',
      },
    },
    take: limit,
  });

  // Get product details
  const productIds = productStats
    .map((p) => p.productId)
    .filter((id): id is string => id !== null);

  const products = await prisma.product.findMany({
    where: { id: { in: productIds } },
    select: {
      id: true,
      title: true,
      imageUrl: true,
    },
  });

  const productMap = new Map(products.map((p) => [p.id, p]));

  return productStats
    .filter((stat) => stat.productId && productMap.has(stat.productId))
    .map((stat) => {
      const product = productMap.get(stat.productId!)!;
      return {
        id: product.id,
        title: product.title,
        imageUrl: product.imageUrl,
        totalQuantitySold: stat._sum.quantity || 0,
        totalRevenue: (stat._sum.price?.toNumber() || 0) * (stat._sum.quantity || 0),
        orderCount: stat._count.orderId,
      };
    });
};

// ==================== CUSTOMER GROWTH ====================

export interface CustomerGrowthData {
  date: string;
  newCustomers: number;
  cumulativeTotal: number;
}

/**
 * Get customer growth over time
 */
export const getCustomerGrowth = async (
  tenantId: string,
  startDate?: string,
  endDate?: string
): Promise<CustomerGrowthData[]> => {
  const where: Prisma.CustomerWhereInput = { tenantId };
  
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

  const customers = await prisma.customer.findMany({
    where,
    select: {
      shopifyCreatedAt: true,
    },
    orderBy: { shopifyCreatedAt: 'asc' },
  });

  // Get total customers before start date for cumulative
  let cumulativeTotal = 0;
  if (startDate) {
    cumulativeTotal = await prisma.customer.count({
      where: {
        tenantId,
        shopifyCreatedAt: { lt: new Date(startDate) },
      },
    });
  }

  const groupedData = new Map<string, number>();

  customers.forEach((customer) => {
    if (!customer.shopifyCreatedAt) return;
    const dateKey = customer.shopifyCreatedAt.toISOString().split('T')[0];
    groupedData.set(dateKey, (groupedData.get(dateKey) || 0) + 1);
  });

  const result: CustomerGrowthData[] = [];
  
  Array.from(groupedData.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .forEach(([date, newCustomers]) => {
      cumulativeTotal += newCustomers;
      result.push({
        date,
        newCustomers,
        cumulativeTotal,
      });
    });

  return result;
};

// ==================== ORDER STATUS DISTRIBUTION ====================

export interface OrderStatusDistribution {
  status: string;
  count: number;
  percentage: number;
}

/**
 * Get order status distribution
 */
export const getOrderStatusDistribution = async (
  tenantId: string
): Promise<{
  financial: OrderStatusDistribution[];
  fulfillment: OrderStatusDistribution[];
}> => {
  const [financialStats, fulfillmentStats, totalOrders] = await Promise.all([
    prisma.order.groupBy({
      by: ['financialStatus'],
      where: { tenantId },
      _count: true,
    }),
    prisma.order.groupBy({
      by: ['fulfillmentStatus'],
      where: { tenantId },
      _count: true,
    }),
    prisma.order.count({ where: { tenantId } }),
  ]);

  const formatDistribution = (
    stats: Array<{ _count: number; financialStatus?: string | null; fulfillmentStatus?: string | null }>,
    key: 'financialStatus' | 'fulfillmentStatus'
  ): OrderStatusDistribution[] => {
    return stats.map((stat) => ({
      status: (stat[key] as string) || 'unknown',
      count: stat._count,
      percentage: totalOrders > 0 
        ? Math.round((stat._count / totalOrders) * 10000) / 100 
        : 0,
    }));
  };

  return {
    financial: formatDistribution(financialStats, 'financialStatus'),
    fulfillment: formatDistribution(fulfillmentStats, 'fulfillmentStatus'),
  };
};

// ==================== GEOGRAPHIC DISTRIBUTION ====================

export interface GeographicData {
  country: string;
  city: string | null;
  orderCount: number;
  revenue: number;
  percentage: number;
}

/**
 * Get sales by geographic location
 */
export const getGeographicDistribution = async (
  tenantId: string,
  groupBy: 'country' | 'city' = 'country'
): Promise<GeographicData[]> => {
  const orders = await prisma.order.findMany({
    where: { tenantId },
    select: {
      shippingCountry: true,
      shippingCity: true,
      totalPrice: true,
    },
  });

  const totalRevenue = orders.reduce(
    (sum, o) => sum + (o.totalPrice?.toNumber() || 0),
    0
  );

  const groupedData = new Map<string, { orderCount: number; revenue: number; city: string | null }>();

  orders.forEach((order) => {
    const key = groupBy === 'city'
      ? `${order.shippingCountry || 'Unknown'}-${order.shippingCity || 'Unknown'}`
      : order.shippingCountry || 'Unknown';

    const existing = groupedData.get(key) || { orderCount: 0, revenue: 0, city: null };
    groupedData.set(key, {
      orderCount: existing.orderCount + 1,
      revenue: existing.revenue + (order.totalPrice?.toNumber() || 0),
      city: groupBy === 'city' ? order.shippingCity : null,
    });
  });

  return Array.from(groupedData.entries())
    .map(([key, data]) => ({
      country: groupBy === 'city' ? key.split('-')[0] : key,
      city: data.city,
      orderCount: data.orderCount,
      revenue: Math.round(data.revenue * 100) / 100,
      percentage: totalRevenue > 0 
        ? Math.round((data.revenue / totalRevenue) * 10000) / 100 
        : 0,
    }))
    .sort((a, b) => b.revenue - a.revenue);
};

// ==================== RECENT ACTIVITY ====================

export interface RecentActivity {
  type: 'order' | 'customer';
  id: string;
  title: string;
  subtitle: string;
  amount?: number;
  timestamp: Date;
}

/**
 * Get recent activity feed
 */
export const getRecentActivity = async (
  tenantId: string,
  limit: number = 10
): Promise<RecentActivity[]> => {
  const [recentOrders, recentCustomers] = await Promise.all([
    prisma.order.findMany({
      where: { tenantId },
      orderBy: { shopifyCreatedAt: 'desc' },
      take: limit,
      select: {
        id: true,
        name: true,
        email: true,
        totalPrice: true,
        shopifyCreatedAt: true,
      },
    }),
    prisma.customer.findMany({
      where: { tenantId },
      orderBy: { shopifyCreatedAt: 'desc' },
      take: limit,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        shopifyCreatedAt: true,
      },
    }),
  ]);

  const activities: RecentActivity[] = [
    ...recentOrders.map((order) => ({
      type: 'order' as const,
      id: order.id,
      title: `New Order ${order.name}`,
      subtitle: order.email || 'No email',
      amount: order.totalPrice?.toNumber(),
      timestamp: order.shopifyCreatedAt || new Date(),
    })),
    ...recentCustomers.map((customer) => ({
      type: 'customer' as const,
      id: customer.id,
      title: `New Customer`,
      subtitle: `${customer.firstName || ''} ${customer.lastName || ''} - ${customer.email || 'No email'}`.trim(),
      timestamp: customer.shopifyCreatedAt || new Date(),
    })),
  ];

  return activities
    .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
    .slice(0, limit);
};

// ==================== SALES SUMMARY ====================

export interface SalesSummary {
  today: { revenue: number; orders: number };
  yesterday: { revenue: number; orders: number };
  thisWeek: { revenue: number; orders: number };
  thisMonth: { revenue: number; orders: number };
  growth: {
    daily: number; // percentage
    weekly: number;
    monthly: number;
  };
}

/**
 * Get sales summary with comparisons
 */
export const getSalesSummary = async (tenantId: string): Promise<SalesSummary> => {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const dayBeforeYesterday = new Date(yesterday);
  dayBeforeYesterday.setDate(dayBeforeYesterday.getDate() - 1);
  
  const startOfWeek = new Date(today);
  startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
  const startOfLastWeek = new Date(startOfWeek);
  startOfLastWeek.setDate(startOfLastWeek.getDate() - 7);
  
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const endOfLastMonth = new Date(startOfMonth);
  endOfLastMonth.setDate(endOfLastMonth.getDate() - 1);

  const getStats = async (start: Date, end: Date) => {
    const result = await prisma.order.aggregate({
      where: {
        tenantId,
        shopifyCreatedAt: {
          gte: start,
          lt: end,
        },
      },
      _sum: { totalPrice: true },
      _count: true,
    });
    return {
      revenue: result._sum.totalPrice?.toNumber() || 0,
      orders: result._count,
    };
  };

  const [
    todayStats,
    yesterdayStats,
    dayBeforeStats,
    thisWeekStats,
    lastWeekStats,
    thisMonthStats,
    lastMonthStats,
  ] = await Promise.all([
    getStats(today, now),
    getStats(yesterday, today),
    getStats(dayBeforeYesterday, yesterday),
    getStats(startOfWeek, now),
    getStats(startOfLastWeek, startOfWeek),
    getStats(startOfMonth, now),
    getStats(startOfLastMonth, endOfLastMonth),
  ]);

  const calcGrowth = (current: number, previous: number): number => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return Math.round(((current - previous) / previous) * 10000) / 100;
  };

  return {
    today: todayStats,
    yesterday: yesterdayStats,
    thisWeek: thisWeekStats,
    thisMonth: thisMonthStats,
    growth: {
      daily: calcGrowth(todayStats.revenue, yesterdayStats.revenue),
      weekly: calcGrowth(thisWeekStats.revenue, lastWeekStats.revenue),
      monthly: calcGrowth(thisMonthStats.revenue, lastMonthStats.revenue),
    },
  };
};


