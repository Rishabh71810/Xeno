import { prisma } from '../../config/database.js';
import { Prisma } from '@prisma/client';

export interface ProductFilters {
  search?: string;
  status?: string;
  vendor?: string;
  productType?: string;
  minPrice?: number;
  maxPrice?: number;
  inStock?: boolean;
}

export interface PaginationOptions {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

/**
 * Get products with filters and pagination
 */
export const getProducts = async (
  tenantId: string,
  filters: ProductFilters = {},
  pagination: PaginationOptions = { page: 1, limit: 10 }
) => {
  const { page, limit, sortBy = 'createdAt', sortOrder = 'desc' } = pagination;
  const skip = (page - 1) * limit;

  // Build where clause
  const where: Prisma.ProductWhereInput = {
    tenantId,
  };

  if (filters.search) {
    where.OR = [
      { title: { contains: filters.search, mode: 'insensitive' } },
      { description: { contains: filters.search, mode: 'insensitive' } },
      { vendor: { contains: filters.search, mode: 'insensitive' } },
    ];
  }

  if (filters.status) {
    where.status = filters.status;
  }

  if (filters.vendor) {
    where.vendor = filters.vendor;
  }

  if (filters.productType) {
    where.productType = filters.productType;
  }

  if (filters.minPrice !== undefined) {
    where.minPrice = { ...where.minPrice as Prisma.DecimalNullableFilter, gte: filters.minPrice };
  }

  if (filters.maxPrice !== undefined) {
    where.maxPrice = { ...where.maxPrice as Prisma.DecimalNullableFilter, lte: filters.maxPrice };
  }

  if (filters.inStock === true) {
    where.totalInventory = { gt: 0 };
  } else if (filters.inStock === false) {
    where.totalInventory = { lte: 0 };
  }

  // Execute query
  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where,
      orderBy: { [sortBy]: sortOrder },
      skip,
      take: limit,
      select: {
        id: true,
        shopifyId: true,
        title: true,
        description: true,
        vendor: true,
        productType: true,
        status: true,
        imageUrl: true,
        totalInventory: true,
        variantCount: true,
        minPrice: true,
        maxPrice: true,
        tags: true,
        shopifyCreatedAt: true,
        createdAt: true,
        updatedAt: true,
      },
    }),
    prisma.product.count({ where }),
  ]);

  return {
    products,
    total,
    page,
    totalPages: Math.ceil(total / limit),
  };
};

/**
 * Get product by ID
 */
export const getProductById = async (tenantId: string, productId: string) => {
  const product = await prisma.product.findFirst({
    where: { id: productId, tenantId },
    include: {
      _count: {
        select: {
          orderItems: true,
        },
      },
    },
  });

  return product;
};

/**
 * Get product vendors (for filters)
 */
export const getProductVendors = async (tenantId: string) => {
  const vendors = await prisma.product.groupBy({
    by: ['vendor'],
    where: { tenantId, vendor: { not: null } },
    _count: true,
    orderBy: { _count: { vendor: 'desc' } },
  });

  return vendors
    .filter((v) => v.vendor)
    .map((v) => ({
      vendor: v.vendor!,
      count: v._count,
    }));
};

/**
 * Get product types (for filters)
 */
export const getProductTypes = async (tenantId: string) => {
  const types = await prisma.product.groupBy({
    by: ['productType'],
    where: { tenantId, productType: { not: null } },
    _count: true,
    orderBy: { _count: { productType: 'desc' } },
  });

  return types
    .filter((t) => t.productType)
    .map((t) => ({
      productType: t.productType!,
      count: t._count,
    }));
};

/**
 * Get product statistics
 */
export const getProductStats = async (tenantId: string) => {
  const [totalProducts, inStock, outOfStock, totalInventory] = await Promise.all([
    prisma.product.count({ where: { tenantId } }),
    prisma.product.count({ where: { tenantId, totalInventory: { gt: 0 } } }),
    prisma.product.count({ where: { tenantId, totalInventory: { lte: 0 } } }),
    prisma.product.aggregate({
      where: { tenantId },
      _sum: { totalInventory: true },
    }),
  ]);

  return {
    totalProducts,
    inStock,
    outOfStock,
    totalInventory: totalInventory._sum.totalInventory || 0,
  };
};



