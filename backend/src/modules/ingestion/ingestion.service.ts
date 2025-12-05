import { prisma } from '../../config/database.js';
import { logger } from '../../utils/logger.js';
import { createShopifyClient, ShopifyClient } from '../shopify/shopify.client.js';
import {
  transformCustomer,
  transformCustomerUpdate,
  transformProduct,
  transformProductUpdate,
  transformOrder,
  transformOrderUpdate,
  transformOrderItem,
} from '../shopify/shopify.transformer.js';
import { SyncType, SyncStatus } from '@prisma/client';
import { NotFoundError, BadRequestError } from '../../middleware/errorHandler.middleware.js';

// Sync result interface
export interface SyncResult {
  success: boolean;
  syncLogId: string;
  recordsProcessed: number;
  recordsFailed: number;
  duration: number;
  message: string;
}

// Sync options interface
export interface SyncOptions {
  fullSync?: boolean;
  createdAtMin?: string;
  updatedAtMin?: string;
  triggeredBy?: string;
}

/**
 * Create a sync log entry
 */
const createSyncLog = async (
  tenantId: string,
  syncType: SyncType,
  triggeredBy?: string
): Promise<string> => {
  const log = await prisma.syncLog.create({
    data: {
      tenantId,
      syncType,
      status: SyncStatus.IN_PROGRESS,
      startedAt: new Date(),
      triggeredBy,
    },
  });
  return log.id;
};

/**
 * Update sync log with results
 */
const updateSyncLog = async (
  syncLogId: string,
  status: SyncStatus,
  recordsProcessed: number,
  recordsFailed: number = 0,
  errorMessage?: string
): Promise<void> => {
  const log = await prisma.syncLog.findUnique({ where: { id: syncLogId } });
  const duration = log ? Date.now() - log.startedAt.getTime() : 0;

  await prisma.syncLog.update({
    where: { id: syncLogId },
    data: {
      status,
      recordsProcessed,
      recordsFailed,
      errorMessage,
      completedAt: new Date(),
      duration,
    },
  });
};

/**
 * Sync customers from Shopify
 */
export const syncCustomers = async (
  tenantId: string,
  options: SyncOptions = {}
): Promise<SyncResult> => {
  const syncLogId = await createSyncLog(tenantId, SyncType.CUSTOMERS, options.triggeredBy);
  const startTime = Date.now();
  let recordsProcessed = 0;
  let recordsFailed = 0;

  try {
    logger.info(`Starting customer sync for tenant: ${tenantId}`);

    const shopifyClient = await createShopifyClient(tenantId);

    // Get last sync time if not full sync
    let updatedAtMin: string | undefined;
    if (!options.fullSync) {
      const tenant = await prisma.tenant.findUnique({
        where: { id: tenantId },
        select: { lastSyncAt: true },
      });
      if (tenant?.lastSyncAt) {
        updatedAtMin = tenant.lastSyncAt.toISOString();
      }
    }

    // Fetch customers from Shopify
    const customers = await shopifyClient.getAllCustomers({
      updatedAtMin: options.updatedAtMin || updatedAtMin,
      onProgress: (count) => {
        logger.debug(`Fetched ${count} customers from Shopify`);
      },
    });

    logger.info(`Fetched ${customers.length} customers from Shopify`);

    // Process customers in batches
    const batchSize = 100;
    for (let i = 0; i < customers.length; i += batchSize) {
      const batch = customers.slice(i, i + batchSize);

      await Promise.all(
        batch.map(async (shopifyCustomer) => {
          try {
            const customerData = transformCustomer(shopifyCustomer, tenantId);

            await prisma.customer.upsert({
              where: {
                tenantId_shopifyId: {
                  tenantId,
                  shopifyId: shopifyCustomer.id.toString(),
                },
              },
              create: customerData,
              update: transformCustomerUpdate(shopifyCustomer),
            });

            recordsProcessed++;
          } catch (error) {
            logger.error(`Failed to sync customer ${shopifyCustomer.id}:`, error);
            recordsFailed++;
          }
        })
      );

      logger.debug(`Processed ${Math.min(i + batchSize, customers.length)}/${customers.length} customers`);
    }

    // Update tenant last sync time
    await prisma.tenant.update({
      where: { id: tenantId },
      data: { lastSyncAt: new Date() },
    });

    await updateSyncLog(syncLogId, SyncStatus.COMPLETED, recordsProcessed, recordsFailed);

    const duration = Date.now() - startTime;
    logger.info(`Customer sync completed for tenant ${tenantId}: ${recordsProcessed} processed, ${recordsFailed} failed in ${duration}ms`);

    return {
      success: true,
      syncLogId,
      recordsProcessed,
      recordsFailed,
      duration,
      message: `Successfully synced ${recordsProcessed} customers`,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    await updateSyncLog(syncLogId, SyncStatus.FAILED, recordsProcessed, recordsFailed, errorMessage);

    logger.error(`Customer sync failed for tenant ${tenantId}:`, error);

    return {
      success: false,
      syncLogId,
      recordsProcessed,
      recordsFailed,
      duration: Date.now() - startTime,
      message: `Sync failed: ${errorMessage}`,
    };
  }
};

/**
 * Sync products from Shopify
 */
export const syncProducts = async (
  tenantId: string,
  options: SyncOptions = {}
): Promise<SyncResult> => {
  const syncLogId = await createSyncLog(tenantId, SyncType.PRODUCTS, options.triggeredBy);
  const startTime = Date.now();
  let recordsProcessed = 0;
  let recordsFailed = 0;

  try {
    logger.info(`Starting product sync for tenant: ${tenantId}`);

    const shopifyClient = await createShopifyClient(tenantId);

    // Get last sync time if not full sync
    let updatedAtMin: string | undefined;
    if (!options.fullSync) {
      const tenant = await prisma.tenant.findUnique({
        where: { id: tenantId },
        select: { lastSyncAt: true },
      });
      if (tenant?.lastSyncAt) {
        updatedAtMin = tenant.lastSyncAt.toISOString();
      }
    }

    // Fetch products from Shopify
    const products = await shopifyClient.getAllProducts({
      updatedAtMin: options.updatedAtMin || updatedAtMin,
      onProgress: (count) => {
        logger.debug(`Fetched ${count} products from Shopify`);
      },
    });

    logger.info(`Fetched ${products.length} products from Shopify`);

    // Process products in batches
    const batchSize = 100;
    for (let i = 0; i < products.length; i += batchSize) {
      const batch = products.slice(i, i + batchSize);

      await Promise.all(
        batch.map(async (shopifyProduct) => {
          try {
            const productData = transformProduct(shopifyProduct, tenantId);

            await prisma.product.upsert({
              where: {
                tenantId_shopifyId: {
                  tenantId,
                  shopifyId: shopifyProduct.id.toString(),
                },
              },
              create: productData,
              update: transformProductUpdate(shopifyProduct),
            });

            recordsProcessed++;
          } catch (error) {
            logger.error(`Failed to sync product ${shopifyProduct.id}:`, error);
            recordsFailed++;
          }
        })
      );

      logger.debug(`Processed ${Math.min(i + batchSize, products.length)}/${products.length} products`);
    }

    await updateSyncLog(syncLogId, SyncStatus.COMPLETED, recordsProcessed, recordsFailed);

    const duration = Date.now() - startTime;
    logger.info(`Product sync completed for tenant ${tenantId}: ${recordsProcessed} processed, ${recordsFailed} failed in ${duration}ms`);

    return {
      success: true,
      syncLogId,
      recordsProcessed,
      recordsFailed,
      duration,
      message: `Successfully synced ${recordsProcessed} products`,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    await updateSyncLog(syncLogId, SyncStatus.FAILED, recordsProcessed, recordsFailed, errorMessage);

    logger.error(`Product sync failed for tenant ${tenantId}:`, error);

    return {
      success: false,
      syncLogId,
      recordsProcessed,
      recordsFailed,
      duration: Date.now() - startTime,
      message: `Sync failed: ${errorMessage}`,
    };
  }
};

/**
 * Sync orders from Shopify
 */
export const syncOrders = async (
  tenantId: string,
  options: SyncOptions = {}
): Promise<SyncResult> => {
  const syncLogId = await createSyncLog(tenantId, SyncType.ORDERS, options.triggeredBy);
  const startTime = Date.now();
  let recordsProcessed = 0;
  let recordsFailed = 0;

  try {
    logger.info(`Starting order sync for tenant: ${tenantId}`);

    const shopifyClient = await createShopifyClient(tenantId);

    // Get last sync time if not full sync
    let updatedAtMin: string | undefined;
    if (!options.fullSync) {
      const tenant = await prisma.tenant.findUnique({
        where: { id: tenantId },
        select: { lastSyncAt: true },
      });
      if (tenant?.lastSyncAt) {
        updatedAtMin = tenant.lastSyncAt.toISOString();
      }
    }

    // Fetch orders from Shopify
    const orders = await shopifyClient.getAllOrders({
      updatedAtMin: options.updatedAtMin || updatedAtMin,
      onProgress: (count) => {
        logger.debug(`Fetched ${count} orders from Shopify`);
      },
    });

    logger.info(`Fetched ${orders.length} orders from Shopify`);

    // Build lookup maps for customers and products
    const customerMap = new Map<string, string>();
    const customers = await prisma.customer.findMany({
      where: { tenantId },
      select: { id: true, shopifyId: true },
    });
    customers.forEach((c) => customerMap.set(c.shopifyId, c.id));

    const productMap = new Map<string, string>();
    const products = await prisma.product.findMany({
      where: { tenantId },
      select: { id: true, shopifyId: true },
    });
    products.forEach((p) => productMap.set(p.shopifyId, p.id));

    // Process orders
    for (const shopifyOrder of orders) {
      try {
        // Find linked customer
        const customerId = shopifyOrder.customer?.id
          ? customerMap.get(shopifyOrder.customer.id.toString())
          : undefined;

        // Upsert order
        const existingOrder = await prisma.order.findUnique({
          where: {
            tenantId_shopifyId: {
              tenantId,
              shopifyId: shopifyOrder.id.toString(),
            },
          },
        });

        let orderId: string;

        if (existingOrder) {
          // Update existing order
          const updated = await prisma.order.update({
            where: { id: existingOrder.id },
            data: transformOrderUpdate(shopifyOrder),
          });
          orderId = updated.id;

          // Delete existing line items for re-sync
          await prisma.orderItem.deleteMany({
            where: { orderId },
          });
        } else {
          // Create new order
          const orderData = transformOrder(shopifyOrder, tenantId, customerId);
          const created = await prisma.order.create({
            data: orderData,
          });
          orderId = created.id;
        }

        // Create line items
        if (shopifyOrder.line_items && shopifyOrder.line_items.length > 0) {
          const lineItems = shopifyOrder.line_items.map((item) => {
            const productId = item.product_id
              ? productMap.get(item.product_id.toString())
              : undefined;
            return transformOrderItem(item, orderId, productId);
          });

          await prisma.orderItem.createMany({
            data: lineItems.map((item) => ({
              orderId,
              productId: item.product?.connect?.id || null,
              shopifyLineItemId: item.shopifyLineItemId,
              shopifyProductId: item.shopifyProductId,
              shopifyVariantId: item.shopifyVariantId,
              title: item.title,
              variantTitle: item.variantTitle,
              sku: item.sku,
              quantity: item.quantity,
              price: item.price as number,
              totalDiscount: item.totalDiscount as number | null,
              fulfillmentStatus: item.fulfillmentStatus,
            })),
          });
        }

        recordsProcessed++;
      } catch (error) {
        logger.error(`Failed to sync order ${shopifyOrder.id}:`, error);
        recordsFailed++;
      }
    }

    await updateSyncLog(syncLogId, SyncStatus.COMPLETED, recordsProcessed, recordsFailed);

    const duration = Date.now() - startTime;
    logger.info(`Order sync completed for tenant ${tenantId}: ${recordsProcessed} processed, ${recordsFailed} failed in ${duration}ms`);

    return {
      success: true,
      syncLogId,
      recordsProcessed,
      recordsFailed,
      duration,
      message: `Successfully synced ${recordsProcessed} orders`,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    await updateSyncLog(syncLogId, SyncStatus.FAILED, recordsProcessed, recordsFailed, errorMessage);

    logger.error(`Order sync failed for tenant ${tenantId}:`, error);

    return {
      success: false,
      syncLogId,
      recordsProcessed,
      recordsFailed,
      duration: Date.now() - startTime,
      message: `Sync failed: ${errorMessage}`,
    };
  }
};

/**
 * Full sync - sync all data types
 */
export const syncAll = async (
  tenantId: string,
  options: SyncOptions = {}
): Promise<{
  customers: SyncResult;
  products: SyncResult;
  orders: SyncResult;
  totalDuration: number;
}> => {
  const startTime = Date.now();

  logger.info(`Starting full sync for tenant: ${tenantId}`);

  // Sync in order: customers first (for order linking), then products, then orders
  const customersResult = await syncCustomers(tenantId, { ...options, fullSync: true });
  const productsResult = await syncProducts(tenantId, { ...options, fullSync: true });
  const ordersResult = await syncOrders(tenantId, { ...options, fullSync: true });

  const totalDuration = Date.now() - startTime;

  logger.info(`Full sync completed for tenant ${tenantId} in ${totalDuration}ms`);

  return {
    customers: customersResult,
    products: productsResult,
    orders: ordersResult,
    totalDuration,
  };
};

/**
 * Get sync status for a tenant
 */
export const getSyncStatus = async (tenantId: string): Promise<{
  lastSync: Date | null;
  inProgress: boolean;
  currentSyncType: string | null;
  recentLogs: Array<{
    id: string;
    syncType: string;
    status: string;
    recordsProcessed: number;
    recordsFailed: number;
    startedAt: Date;
    completedAt: Date | null;
    duration: number | null;
  }>;
}> => {
  const [tenant, inProgressSync, recentLogs] = await Promise.all([
    prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { lastSyncAt: true },
    }),
    prisma.syncLog.findFirst({
      where: { tenantId, status: SyncStatus.IN_PROGRESS },
      select: { syncType: true },
    }),
    prisma.syncLog.findMany({
      where: { tenantId },
      orderBy: { startedAt: 'desc' },
      take: 10,
      select: {
        id: true,
        syncType: true,
        status: true,
        recordsProcessed: true,
        recordsFailed: true,
        startedAt: true,
        completedAt: true,
        duration: true,
      },
    }),
  ]);

  return {
    lastSync: tenant?.lastSyncAt || null,
    inProgress: !!inProgressSync,
    currentSyncType: inProgressSync?.syncType || null,
    recentLogs,
  };
};

/**
 * Get sync logs with pagination
 */
export const getSyncLogs = async (
  tenantId: string,
  page: number = 1,
  limit: number = 20
): Promise<{
  logs: Array<{
    id: string;
    syncType: string;
    status: string;
    recordsProcessed: number;
    recordsFailed: number;
    errorMessage: string | null;
    startedAt: Date;
    completedAt: Date | null;
    duration: number | null;
    triggeredBy: string | null;
  }>;
  total: number;
  page: number;
  totalPages: number;
}> => {
  const skip = (page - 1) * limit;

  const [logs, total] = await Promise.all([
    prisma.syncLog.findMany({
      where: { tenantId },
      orderBy: { startedAt: 'desc' },
      skip,
      take: limit,
      select: {
        id: true,
        syncType: true,
        status: true,
        recordsProcessed: true,
        recordsFailed: true,
        errorMessage: true,
        startedAt: true,
        completedAt: true,
        duration: true,
        triggeredBy: true,
      },
    }),
    prisma.syncLog.count({ where: { tenantId } }),
  ]);

  return {
    logs,
    total,
    page,
    totalPages: Math.ceil(total / limit),
  };
};


