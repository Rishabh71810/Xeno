import { Prisma } from '@prisma/client';
import {
  ShopifyCustomer,
  ShopifyProduct,
  ShopifyOrder,
  ShopifyLineItem,
  ShopifyCheckout,
} from '../../types/shopify.types.js';

/**
 * Transform Shopify customer to database format
 */
export const transformCustomer = (
  customer: ShopifyCustomer,
  tenantId: string
): Prisma.CustomerCreateInput => {
  const tags = customer.tags ? customer.tags.split(',').map((t) => t.trim()).filter(Boolean) : [];

  return {
    tenant: { connect: { id: tenantId } },
    shopifyId: customer.id.toString(),
    email: customer.email || null,
    firstName: customer.first_name || null,
    lastName: customer.last_name || null,
    phone: customer.phone || null,
    totalSpent: parseFloat(customer.total_spent) || 0,
    totalOrders: customer.orders_count || 0,
    tags,
    acceptsMarketing: customer.accepts_marketing || false,
    state: customer.state || null,
    defaultAddressCity: customer.default_address?.city || null,
    defaultAddressState: customer.default_address?.province || null,
    defaultAddressCountry: customer.default_address?.country || null,
    defaultAddressZip: customer.default_address?.zip || null,
    shopifyCreatedAt: customer.created_at ? new Date(customer.created_at) : null,
    shopifyUpdatedAt: customer.updated_at ? new Date(customer.updated_at) : null,
  };
};

/**
 * Transform Shopify customer for update
 */
export const transformCustomerUpdate = (
  customer: ShopifyCustomer
): Prisma.CustomerUpdateInput => {
  const tags = customer.tags ? customer.tags.split(',').map((t) => t.trim()).filter(Boolean) : [];

  return {
    email: customer.email || null,
    firstName: customer.first_name || null,
    lastName: customer.last_name || null,
    phone: customer.phone || null,
    totalSpent: parseFloat(customer.total_spent) || 0,
    totalOrders: customer.orders_count || 0,
    tags,
    acceptsMarketing: customer.accepts_marketing || false,
    state: customer.state || null,
    defaultAddressCity: customer.default_address?.city || null,
    defaultAddressState: customer.default_address?.province || null,
    defaultAddressCountry: customer.default_address?.country || null,
    defaultAddressZip: customer.default_address?.zip || null,
    shopifyUpdatedAt: customer.updated_at ? new Date(customer.updated_at) : null,
  };
};

/**
 * Transform Shopify product to database format
 */
export const transformProduct = (
  product: ShopifyProduct,
  tenantId: string
): Prisma.ProductCreateInput => {
  const tags = product.tags ? product.tags.split(',').map((t) => t.trim()).filter(Boolean) : [];
  
  // Calculate inventory and price from variants
  const variants = product.variants || [];
  const totalInventory = variants.reduce((sum, v) => sum + (v.inventory_quantity || 0), 0);
  const prices = variants.map((v) => parseFloat(v.price)).filter((p) => !isNaN(p));
  const minPrice = prices.length > 0 ? Math.min(...prices) : null;
  const maxPrice = prices.length > 0 ? Math.max(...prices) : null;

  return {
    tenant: { connect: { id: tenantId } },
    shopifyId: product.id.toString(),
    title: product.title,
    description: product.body_html || null,
    vendor: product.vendor || null,
    productType: product.product_type || null,
    handle: product.handle || null,
    status: product.status || 'active',
    tags,
    imageUrl: product.image?.src || product.images?.[0]?.src || null,
    totalInventory,
    variantCount: variants.length,
    minPrice,
    maxPrice,
    shopifyCreatedAt: product.created_at ? new Date(product.created_at) : null,
    shopifyUpdatedAt: product.updated_at ? new Date(product.updated_at) : null,
    publishedAt: product.published_at ? new Date(product.published_at) : null,
  };
};

/**
 * Transform Shopify product for update
 */
export const transformProductUpdate = (
  product: ShopifyProduct
): Prisma.ProductUpdateInput => {
  const tags = product.tags ? product.tags.split(',').map((t) => t.trim()).filter(Boolean) : [];
  
  const variants = product.variants || [];
  const totalInventory = variants.reduce((sum, v) => sum + (v.inventory_quantity || 0), 0);
  const prices = variants.map((v) => parseFloat(v.price)).filter((p) => !isNaN(p));
  const minPrice = prices.length > 0 ? Math.min(...prices) : null;
  const maxPrice = prices.length > 0 ? Math.max(...prices) : null;

  return {
    title: product.title,
    description: product.body_html || null,
    vendor: product.vendor || null,
    productType: product.product_type || null,
    handle: product.handle || null,
    status: product.status || 'active',
    tags,
    imageUrl: product.image?.src || product.images?.[0]?.src || null,
    totalInventory,
    variantCount: variants.length,
    minPrice,
    maxPrice,
    shopifyUpdatedAt: product.updated_at ? new Date(product.updated_at) : null,
    publishedAt: product.published_at ? new Date(product.published_at) : null,
  };
};

/**
 * Transform Shopify order to database format
 */
export const transformOrder = (
  order: ShopifyOrder,
  tenantId: string,
  customerId?: string
): Prisma.OrderCreateInput => {
  const tags = order.tags ? order.tags.split(',').map((t) => t.trim()).filter(Boolean) : [];
  
  // Calculate total shipping
  const totalShipping = order.total_shipping_price_set?.shop_money?.amount
    ? parseFloat(order.total_shipping_price_set.shop_money.amount)
    : null;

  const orderData: Prisma.OrderCreateInput = {
    tenant: { connect: { id: tenantId } },
    shopifyId: order.id.toString(),
    orderNumber: order.order_number,
    name: order.name || null,
    email: order.email || null,
    phone: order.phone || null,
    financialStatus: order.financial_status || null,
    fulfillmentStatus: order.fulfillment_status || null,
    currency: order.currency || 'USD',
    totalPrice: parseFloat(order.total_price) || 0,
    subtotalPrice: order.subtotal_price ? parseFloat(order.subtotal_price) : null,
    totalTax: order.total_tax ? parseFloat(order.total_tax) : null,
    totalDiscounts: order.total_discounts ? parseFloat(order.total_discounts) : null,
    totalShipping,
    shippingCity: order.shipping_address?.city || null,
    shippingState: order.shipping_address?.province || null,
    shippingCountry: order.shipping_address?.country || null,
    shippingZip: order.shipping_address?.zip || null,
    itemCount: order.line_items?.length || 0,
    note: order.note || null,
    tags,
    cancelledAt: order.cancelled_at ? new Date(order.cancelled_at) : null,
    cancelReason: order.cancel_reason || null,
    sourceName: order.source_name || null,
    shopifyCreatedAt: order.created_at ? new Date(order.created_at) : null,
    shopifyUpdatedAt: order.updated_at ? new Date(order.updated_at) : null,
    processedAt: order.processed_at ? new Date(order.processed_at) : null,
    closedAt: order.closed_at ? new Date(order.closed_at) : null,
  };

  // Connect customer if provided
  if (customerId) {
    orderData.customer = { connect: { id: customerId } };
  }

  return orderData;
};

/**
 * Transform Shopify order for update
 */
export const transformOrderUpdate = (
  order: ShopifyOrder
): Prisma.OrderUpdateInput => {
  const tags = order.tags ? order.tags.split(',').map((t) => t.trim()).filter(Boolean) : [];
  
  const totalShipping = order.total_shipping_price_set?.shop_money?.amount
    ? parseFloat(order.total_shipping_price_set.shop_money.amount)
    : null;

  return {
    email: order.email || null,
    phone: order.phone || null,
    financialStatus: order.financial_status || null,
    fulfillmentStatus: order.fulfillment_status || null,
    totalPrice: parseFloat(order.total_price) || 0,
    subtotalPrice: order.subtotal_price ? parseFloat(order.subtotal_price) : null,
    totalTax: order.total_tax ? parseFloat(order.total_tax) : null,
    totalDiscounts: order.total_discounts ? parseFloat(order.total_discounts) : null,
    totalShipping,
    note: order.note || null,
    tags,
    cancelledAt: order.cancelled_at ? new Date(order.cancelled_at) : null,
    cancelReason: order.cancel_reason || null,
    shopifyUpdatedAt: order.updated_at ? new Date(order.updated_at) : null,
    closedAt: order.closed_at ? new Date(order.closed_at) : null,
  };
};

/**
 * Transform Shopify line item to database format
 */
export const transformOrderItem = (
  lineItem: ShopifyLineItem,
  orderId: string,
  productId?: string
): Prisma.OrderItemCreateInput => {
  return {
    order: { connect: { id: orderId } },
    ...(productId && { product: { connect: { id: productId } } }),
    shopifyLineItemId: lineItem.id?.toString() || null,
    shopifyProductId: lineItem.product_id?.toString() || null,
    shopifyVariantId: lineItem.variant_id?.toString() || null,
    title: lineItem.title,
    variantTitle: lineItem.variant_title || null,
    sku: lineItem.sku || null,
    quantity: lineItem.quantity,
    price: parseFloat(lineItem.price) || 0,
    totalDiscount: lineItem.total_discount ? parseFloat(lineItem.total_discount) : null,
    fulfillmentStatus: lineItem.fulfillment_status || null,
  };
};

/**
 * Transform Shopify checkout to event
 */
export const transformCheckoutToEvent = (
  checkout: ShopifyCheckout,
  tenantId: string,
  eventType: 'CHECKOUT_STARTED' | 'CHECKOUT_ABANDONED' | 'CART_ABANDONED'
): Prisma.EventCreateInput => {
  return {
    tenant: { connect: { id: tenantId } },
    eventType,
    shopifyId: checkout.id?.toString() || checkout.token,
    customerId: checkout.customer?.id?.toString() || null,
    email: checkout.email || null,
    totalPrice: checkout.total_price ? parseFloat(checkout.total_price) : null,
    itemCount: checkout.line_items?.length || null,
    currency: checkout.currency || null,
    metadata: {
      abandonedCheckoutUrl: checkout.abandoned_checkout_url,
      subtotalPrice: checkout.subtotal_price,
      totalTax: checkout.total_tax,
    },
    source: 'shopify_webhook',
    occurredAt: checkout.updated_at ? new Date(checkout.updated_at) : new Date(),
  };
};

