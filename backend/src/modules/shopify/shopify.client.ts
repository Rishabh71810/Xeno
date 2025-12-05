import axios, { AxiosInstance, AxiosError } from 'axios';
import { prisma } from '../../config/database.js';
import { env } from '../../config/env.js';
import { decrypt } from '../../utils/crypto.js';
import { logger } from '../../utils/logger.js';
import {
  ShopifyCustomer,
  ShopifyProduct,
  ShopifyOrder,
  ShopifyCheckout,
} from '../../types/shopify.types.js';
import { BadRequestError, NotFoundError } from '../../middleware/errorHandler.middleware.js';

// Shopify API rate limiting
const RATE_LIMIT_DELAY = 500; // ms between requests

// Shopify REST API client
export class ShopifyClient {
  private client: AxiosInstance;
  private tenantId: string;
  private shopifyDomain: string;

  constructor(tenantId: string, shopifyDomain: string, accessToken: string) {
    this.tenantId = tenantId;
    this.shopifyDomain = shopifyDomain;

    this.client = axios.create({
      baseURL: `https://${shopifyDomain}/admin/api/${env.SHOPIFY_API_VERSION}`,
      headers: {
        'X-Shopify-Access-Token': accessToken,
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    });

    // Add response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => {
        if (error.response?.status === 429) {
          logger.warn(`Shopify rate limit hit for ${shopifyDomain}`);
        }
        throw error;
      }
    );
  }

  // Helper to delay between requests (rate limiting)
  private async delay(ms: number = RATE_LIMIT_DELAY): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // ==================== SHOP INFO ====================

  async getShopInfo(): Promise<{
    name: string;
    email: string;
    domain: string;
    plan: string;
    currency: string;
    timezone: string;
  }> {
    const response = await this.client.get('/shop.json');
    const shop = response.data.shop;
    return {
      name: shop.name,
      email: shop.email,
      domain: shop.domain,
      plan: shop.plan_display_name || shop.plan_name,
      currency: shop.currency,
      timezone: shop.timezone,
    };
  }

  // ==================== CUSTOMERS ====================

  async getCustomers(params: {
    limit?: number;
    since_id?: string;
    created_at_min?: string;
    created_at_max?: string;
    updated_at_min?: string;
    updated_at_max?: string;
  } = {}): Promise<ShopifyCustomer[]> {
    const response = await this.client.get('/customers.json', {
      params: { limit: params.limit || 250, ...params },
    });
    return response.data.customers;
  }

  async getAllCustomers(options: {
    createdAtMin?: string;
    updatedAtMin?: string;
    onProgress?: (count: number) => void;
  } = {}): Promise<ShopifyCustomer[]> {
    const allCustomers: ShopifyCustomer[] = [];
    let sinceId: string | undefined;
    let hasMore = true;

    while (hasMore) {
      const customers = await this.getCustomers({
        limit: 250,
        since_id: sinceId,
        created_at_min: options.createdAtMin,
        updated_at_min: options.updatedAtMin,
      });

      if (customers.length === 0) {
        hasMore = false;
      } else {
        allCustomers.push(...customers);
        sinceId = customers[customers.length - 1].id.toString();
        
        if (options.onProgress) {
          options.onProgress(allCustomers.length);
        }

        if (customers.length < 250) {
          hasMore = false;
        } else {
          await this.delay();
        }
      }
    }

    return allCustomers;
  }

  async getCustomer(customerId: string): Promise<ShopifyCustomer> {
    const response = await this.client.get(`/customers/${customerId}.json`);
    return response.data.customer;
  }

  async getCustomerCount(): Promise<number> {
    const response = await this.client.get('/customers/count.json');
    return response.data.count;
  }

  // ==================== PRODUCTS ====================

  async getProducts(params: {
    limit?: number;
    since_id?: string;
    created_at_min?: string;
    created_at_max?: string;
    updated_at_min?: string;
    updated_at_max?: string;
    status?: string;
  } = {}): Promise<ShopifyProduct[]> {
    const response = await this.client.get('/products.json', {
      params: { limit: params.limit || 250, ...params },
    });
    return response.data.products;
  }

  async getAllProducts(options: {
    createdAtMin?: string;
    updatedAtMin?: string;
    status?: string;
    onProgress?: (count: number) => void;
  } = {}): Promise<ShopifyProduct[]> {
    const allProducts: ShopifyProduct[] = [];
    let sinceId: string | undefined;
    let hasMore = true;

    while (hasMore) {
      const products = await this.getProducts({
        limit: 250,
        since_id: sinceId,
        created_at_min: options.createdAtMin,
        updated_at_min: options.updatedAtMin,
        status: options.status,
      });

      if (products.length === 0) {
        hasMore = false;
      } else {
        allProducts.push(...products);
        sinceId = products[products.length - 1].id.toString();
        
        if (options.onProgress) {
          options.onProgress(allProducts.length);
        }

        if (products.length < 250) {
          hasMore = false;
        } else {
          await this.delay();
        }
      }
    }

    return allProducts;
  }

  async getProduct(productId: string): Promise<ShopifyProduct> {
    const response = await this.client.get(`/products/${productId}.json`);
    return response.data.product;
  }

  async getProductCount(): Promise<number> {
    const response = await this.client.get('/products/count.json');
    return response.data.count;
  }

  // ==================== ORDERS ====================

  async getOrders(params: {
    limit?: number;
    since_id?: string;
    created_at_min?: string;
    created_at_max?: string;
    updated_at_min?: string;
    updated_at_max?: string;
    status?: string;
    financial_status?: string;
    fulfillment_status?: string;
  } = {}): Promise<ShopifyOrder[]> {
    const response = await this.client.get('/orders.json', {
      params: { limit: params.limit || 250, status: 'any', ...params },
    });
    return response.data.orders;
  }

  async getAllOrders(options: {
    createdAtMin?: string;
    updatedAtMin?: string;
    status?: string;
    onProgress?: (count: number) => void;
  } = {}): Promise<ShopifyOrder[]> {
    const allOrders: ShopifyOrder[] = [];
    let sinceId: string | undefined;
    let hasMore = true;

    while (hasMore) {
      const orders = await this.getOrders({
        limit: 250,
        since_id: sinceId,
        created_at_min: options.createdAtMin,
        updated_at_min: options.updatedAtMin,
        status: options.status || 'any',
      });

      if (orders.length === 0) {
        hasMore = false;
      } else {
        allOrders.push(...orders);
        sinceId = orders[orders.length - 1].id.toString();
        
        if (options.onProgress) {
          options.onProgress(allOrders.length);
        }

        if (orders.length < 250) {
          hasMore = false;
        } else {
          await this.delay();
        }
      }
    }

    return allOrders;
  }

  async getOrder(orderId: string): Promise<ShopifyOrder> {
    const response = await this.client.get(`/orders/${orderId}.json`);
    return response.data.order;
  }

  async getOrderCount(params: { status?: string } = {}): Promise<number> {
    const response = await this.client.get('/orders/count.json', {
      params: { status: 'any', ...params },
    });
    return response.data.count;
  }

  // ==================== CHECKOUTS (Abandoned Carts) ====================

  async getCheckouts(params: {
    limit?: number;
    since_id?: string;
    created_at_min?: string;
    updated_at_min?: string;
  } = {}): Promise<ShopifyCheckout[]> {
    const response = await this.client.get('/checkouts.json', {
      params: { limit: params.limit || 250, ...params },
    });
    return response.data.checkouts;
  }

  async getAbandonedCheckouts(params: {
    limit?: number;
    since_id?: string;
  } = {}): Promise<ShopifyCheckout[]> {
    // Abandoned checkouts are checkouts without completed_at
    const checkouts = await this.getCheckouts(params);
    return checkouts.filter((c) => !c.completed_at);
  }

  // ==================== WEBHOOKS ====================

  async getWebhooks(): Promise<Array<{
    id: number;
    address: string;
    topic: string;
    created_at: string;
    format: string;
  }>> {
    const response = await this.client.get('/webhooks.json');
    return response.data.webhooks;
  }

  async createWebhook(topic: string, address: string): Promise<{
    id: number;
    address: string;
    topic: string;
  }> {
    const response = await this.client.post('/webhooks.json', {
      webhook: {
        topic,
        address,
        format: 'json',
      },
    });
    return response.data.webhook;
  }

  async deleteWebhook(webhookId: number): Promise<void> {
    await this.client.delete(`/webhooks/${webhookId}.json`);
  }
}

// Factory function to create Shopify client from tenant ID
export const createShopifyClient = async (tenantId: string): Promise<ShopifyClient> => {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: {
      id: true,
      shopifyDomain: true,
      shopifyAccessToken: true,
      isActive: true,
    },
  });

  if (!tenant) {
    throw new NotFoundError('Tenant not found');
  }

  if (!tenant.isActive) {
    throw new BadRequestError('Tenant is not active');
  }

  if (!tenant.shopifyAccessToken) {
    throw new BadRequestError('Shopify access token not configured');
  }

  // Decrypt the access token
  const accessToken = decrypt(tenant.shopifyAccessToken);

  return new ShopifyClient(tenant.id, tenant.shopifyDomain, accessToken);
};

// Export singleton-like function for quick access
export const getShopifyClient = createShopifyClient;



