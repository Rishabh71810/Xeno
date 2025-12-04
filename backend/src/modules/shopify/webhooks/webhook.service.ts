import { prisma } from '../../../config/database.js';
import { logger } from '../../../utils/logger.js';
import {
  transformCustomer,
  transformCustomerUpdate,
  transformProduct,
  transformProductUpdate,
  transformOrder,
  transformOrderUpdate,
  transformOrderItem,
  transformCheckoutToEvent,
} from '../shopify.transformer.js';
import {
  ShopifyCustomer,
  ShopifyProduct,
  ShopifyOrder,
  ShopifyCheckout,
} from '../../../types/shopify.types.js';
import { SyncType, SyncStatus } from '@prisma/client';

/**
 * Log webhook processing
 */
const logWebhook = async (
  tenantId: string,
  success: boolean,
  recordsProcessed: number = 1,
  errorMessage?: string
): Promise<void> => {
  await prisma.syncLog.create({
    data: {
      tenantId,
      syncType: SyncType.WEBHOOK,
      status: success ? SyncStatus.COMPLETED : SyncStatus.FAILED,
      recordsProcessed,
      errorMessage,
      startedAt: new Date(),
      completedAt: new Date(),
      duration: 0,
      triggeredBy: 'webhook',
    },
  });
};

// ==================== CUSTOMER WEBHOOKS ====================

/**
 * Handle customer create webhook
 */
export const handleCustomerCreate = async (
  tenantId: string,
  payload: ShopifyCustomer
): Promise<void> => {
  try {
    logger.info(`Processing customer create webhook for tenant ${tenantId}, customer ${payload.id}`);

    const customerData = transformCustomer(payload, tenantId);

    await prisma.customer.upsert({
      where: {
        tenantId_shopifyId: {
          tenantId,
          shopifyId: payload.id.toString(),
        },
      },
      create: customerData,
      update: transformCustomerUpdate(payload),
    });

    await logWebhook(tenantId, true);
    logger.info(`Customer ${payload.id} created/updated for tenant ${tenantId}`);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    await logWebhook(tenantId, false, 0, errorMessage);
    logger.error(`Failed to process customer create webhook:`, error);
    throw error;
  }
};

/**
 * Handle customer update webhook
 */
export const handleCustomerUpdate = async (
  tenantId: string,
  payload: ShopifyCustomer
): Promise<void> => {
  try {
    logger.info(`Processing customer update webhook for tenant ${tenantId}, customer ${payload.id}`);

    await prisma.customer.upsert({
      where: {
        tenantId_shopifyId: {
          tenantId,
          shopifyId: payload.id.toString(),
        },
      },
      create: transformCustomer(payload, tenantId),
      update: transformCustomerUpdate(payload),
    });

    await logWebhook(tenantId, true);
    logger.info(`Customer ${payload.id} updated for tenant ${tenantId}`);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    await logWebhook(tenantId, false, 0, errorMessage);
    logger.error(`Failed to process customer update webhook:`, error);
    throw error;
  }
};

/**
 * Handle customer delete webhook
 */
export const handleCustomerDelete = async (
  tenantId: string,
  payload: { id: number }
): Promise<void> => {
  try {
    logger.info(`Processing customer delete webhook for tenant ${tenantId}, customer ${payload.id}`);

    // Soft delete - we keep the record but could mark it as deleted
    // For now, we'll actually delete it since Shopify deleted it
    await prisma.customer.deleteMany({
      where: {
        tenantId,
        shopifyId: payload.id.toString(),
      },
    });

    await logWebhook(tenantId, true);
    logger.info(`Customer ${payload.id} deleted for tenant ${tenantId}`);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    await logWebhook(tenantId, false, 0, errorMessage);
    logger.error(`Failed to process customer delete webhook:`, error);
    throw error;
  }
};

// ==================== PRODUCT WEBHOOKS ====================

/**
 * Handle product create webhook
 */
export const handleProductCreate = async (
  tenantId: string,
  payload: ShopifyProduct
): Promise<void> => {
  try {
    logger.info(`Processing product create webhook for tenant ${tenantId}, product ${payload.id}`);

    const productData = transformProduct(payload, tenantId);

    await prisma.product.upsert({
      where: {
        tenantId_shopifyId: {
          tenantId,
          shopifyId: payload.id.toString(),
        },
      },
      create: productData,
      update: transformProductUpdate(payload),
    });

    await logWebhook(tenantId, true);
    logger.info(`Product ${payload.id} created/updated for tenant ${tenantId}`);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    await logWebhook(tenantId, false, 0, errorMessage);
    logger.error(`Failed to process product create webhook:`, error);
    throw error;
  }
};

/**
 * Handle product update webhook
 */
export const handleProductUpdate = async (
  tenantId: string,
  payload: ShopifyProduct
): Promise<void> => {
  try {
    logger.info(`Processing product update webhook for tenant ${tenantId}, product ${payload.id}`);

    await prisma.product.upsert({
      where: {
        tenantId_shopifyId: {
          tenantId,
          shopifyId: payload.id.toString(),
        },
      },
      create: transformProduct(payload, tenantId),
      update: transformProductUpdate(payload),
    });

    await logWebhook(tenantId, true);
    logger.info(`Product ${payload.id} updated for tenant ${tenantId}`);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    await logWebhook(tenantId, false, 0, errorMessage);
    logger.error(`Failed to process product update webhook:`, error);
    throw error;
  }
};

/**
 * Handle product delete webhook
 */
export const handleProductDelete = async (
  tenantId: string,
  payload: { id: number }
): Promise<void> => {
  try {
    logger.info(`Processing product delete webhook for tenant ${tenantId}, product ${payload.id}`);

    await prisma.product.deleteMany({
      where: {
        tenantId,
        shopifyId: payload.id.toString(),
      },
    });

    await logWebhook(tenantId, true);
    logger.info(`Product ${payload.id} deleted for tenant ${tenantId}`);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    await logWebhook(tenantId, false, 0, errorMessage);
    logger.error(`Failed to process product delete webhook:`, error);
    throw error;
  }
};

// ==================== ORDER WEBHOOKS ====================

/**
 * Handle order create webhook
 */
export const handleOrderCreate = async (
  tenantId: string,
  payload: ShopifyOrder
): Promise<void> => {
  try {
    logger.info(`Processing order create webhook for tenant ${tenantId}, order ${payload.id}`);

    // Find linked customer
    let customerId: string | undefined;
    if (payload.customer?.id) {
      const customer = await prisma.customer.findUnique({
        where: {
          tenantId_shopifyId: {
            tenantId,
            shopifyId: payload.customer.id.toString(),
          },
        },
        select: { id: true },
      });
      customerId = customer?.id;
    }

    // Build product map for line items
    const productMap = new Map<string, string>();
    const productIds = payload.line_items
      ?.filter((li) => li.product_id)
      .map((li) => li.product_id!.toString()) || [];

    if (productIds.length > 0) {
      const products = await prisma.product.findMany({
        where: { tenantId, shopifyId: { in: productIds } },
        select: { id: true, shopifyId: true },
      });
      products.forEach((p) => productMap.set(p.shopifyId, p.id));
    }

    // Create order
    const orderData = transformOrder(payload, tenantId, customerId);
    const order = await prisma.order.create({
      data: orderData,
    });

    // Create line items
    if (payload.line_items && payload.line_items.length > 0) {
      await prisma.orderItem.createMany({
        data: payload.line_items.map((item) => ({
          orderId: order.id,
          productId: item.product_id ? productMap.get(item.product_id.toString()) || null : null,
          shopifyLineItemId: item.id?.toString() || null,
          shopifyProductId: item.product_id?.toString() || null,
          shopifyVariantId: item.variant_id?.toString() || null,
          title: item.title,
          variantTitle: item.variant_title || null,
          sku: item.sku || null,
          quantity: item.quantity,
          price: parseFloat(item.price) || 0,
          totalDiscount: item.total_discount ? parseFloat(item.total_discount) : null,
          fulfillmentStatus: item.fulfillment_status || null,
        })),
      });
    }

    await logWebhook(tenantId, true);
    logger.info(`Order ${payload.id} created for tenant ${tenantId}`);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    await logWebhook(tenantId, false, 0, errorMessage);
    logger.error(`Failed to process order create webhook:`, error);
    throw error;
  }
};

/**
 * Handle order update webhook
 */
export const handleOrderUpdate = async (
  tenantId: string,
  payload: ShopifyOrder
): Promise<void> => {
  try {
    logger.info(`Processing order update webhook for tenant ${tenantId}, order ${payload.id}`);

    const existingOrder = await prisma.order.findUnique({
      where: {
        tenantId_shopifyId: {
          tenantId,
          shopifyId: payload.id.toString(),
        },
      },
    });

    if (existingOrder) {
      await prisma.order.update({
        where: { id: existingOrder.id },
        data: transformOrderUpdate(payload),
      });

      await logWebhook(tenantId, true);
      logger.info(`Order ${payload.id} updated for tenant ${tenantId}`);
    } else {
      // Order doesn't exist, create it
      await handleOrderCreate(tenantId, payload);
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    await logWebhook(tenantId, false, 0, errorMessage);
    logger.error(`Failed to process order update webhook:`, error);
    throw error;
  }
};

/**
 * Handle order cancelled webhook
 */
export const handleOrderCancelled = async (
  tenantId: string,
  payload: ShopifyOrder
): Promise<void> => {
  try {
    logger.info(`Processing order cancelled webhook for tenant ${tenantId}, order ${payload.id}`);

    await prisma.order.updateMany({
      where: {
        tenantId,
        shopifyId: payload.id.toString(),
      },
      data: {
        cancelledAt: payload.cancelled_at ? new Date(payload.cancelled_at) : new Date(),
        cancelReason: payload.cancel_reason || null,
        financialStatus: payload.financial_status || 'voided',
      },
    });

    await logWebhook(tenantId, true);
    logger.info(`Order ${payload.id} marked as cancelled for tenant ${tenantId}`);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    await logWebhook(tenantId, false, 0, errorMessage);
    logger.error(`Failed to process order cancelled webhook:`, error);
    throw error;
  }
};

// ==================== CHECKOUT WEBHOOKS (Abandoned Cart) ====================

/**
 * Handle checkout create webhook
 */
export const handleCheckoutCreate = async (
  tenantId: string,
  payload: ShopifyCheckout
): Promise<void> => {
  try {
    logger.info(`Processing checkout create webhook for tenant ${tenantId}, checkout ${payload.id}`);

    const eventData = transformCheckoutToEvent(payload, tenantId, 'CHECKOUT_STARTED');

    await prisma.event.create({
      data: eventData,
    });

    await logWebhook(tenantId, true);
    logger.info(`Checkout event created for tenant ${tenantId}`);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    await logWebhook(tenantId, false, 0, errorMessage);
    logger.error(`Failed to process checkout create webhook:`, error);
    throw error;
  }
};

/**
 * Handle checkout update webhook (potential abandoned cart)
 */
export const handleCheckoutUpdate = async (
  tenantId: string,
  payload: ShopifyCheckout
): Promise<void> => {
  try {
    logger.info(`Processing checkout update webhook for tenant ${tenantId}, checkout ${payload.id}`);

    // If checkout is completed, don't track as abandoned
    if (payload.completed_at) {
      const eventData = transformCheckoutToEvent(payload, tenantId, 'CHECKOUT_STARTED');
      // Update event type to completed if it exists
      await prisma.event.updateMany({
        where: {
          tenantId,
          shopifyId: payload.id?.toString() || payload.token,
        },
        data: {
          eventType: 'CHECKOUT_COMPLETED',
          occurredAt: new Date(payload.completed_at),
        },
      });
    } else {
      // Update or create checkout event
      const existingEvent = await prisma.event.findFirst({
        where: {
          tenantId,
          shopifyId: payload.id?.toString() || payload.token,
        },
      });

      if (existingEvent) {
        await prisma.event.update({
          where: { id: existingEvent.id },
          data: {
            totalPrice: payload.total_price ? parseFloat(payload.total_price) : null,
            itemCount: payload.line_items?.length || null,
            occurredAt: new Date(),
          },
        });
      } else {
        const eventData = transformCheckoutToEvent(payload, tenantId, 'CHECKOUT_STARTED');
        await prisma.event.create({
          data: eventData,
        });
      }
    }

    await logWebhook(tenantId, true);
    logger.info(`Checkout event updated for tenant ${tenantId}`);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    await logWebhook(tenantId, false, 0, errorMessage);
    logger.error(`Failed to process checkout update webhook:`, error);
    throw error;
  }
};

