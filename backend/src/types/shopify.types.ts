// Shopify API response types

export interface ShopifyCustomer {
  id: number;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  created_at: string;
  updated_at: string;
  orders_count: number;
  total_spent: string;
  state: string;
  tags: string;
  accepts_marketing: boolean;
  default_address?: ShopifyAddress;
  addresses?: ShopifyAddress[];
}

export interface ShopifyAddress {
  id: number;
  customer_id: number;
  first_name: string | null;
  last_name: string | null;
  company: string | null;
  address1: string | null;
  address2: string | null;
  city: string | null;
  province: string | null;
  country: string | null;
  zip: string | null;
  phone: string | null;
  province_code: string | null;
  country_code: string | null;
  country_name: string | null;
  default: boolean;
}

export interface ShopifyProduct {
  id: number;
  title: string;
  body_html: string | null;
  vendor: string | null;
  product_type: string | null;
  handle: string | null;
  created_at: string;
  updated_at: string;
  published_at: string | null;
  status: string;
  tags: string;
  image?: ShopifyImage;
  images?: ShopifyImage[];
  variants: ShopifyVariant[];
}

export interface ShopifyVariant {
  id: number;
  product_id: number;
  title: string;
  price: string;
  sku: string | null;
  inventory_quantity: number;
  created_at: string;
  updated_at: string;
}

export interface ShopifyImage {
  id: number;
  product_id: number;
  src: string;
  alt: string | null;
}

export interface ShopifyOrder {
  id: number;
  order_number: number;
  name: string;
  email: string | null;
  phone: string | null;
  created_at: string;
  updated_at: string;
  processed_at: string | null;
  closed_at: string | null;
  cancelled_at: string | null;
  cancel_reason: string | null;
  financial_status: string;
  fulfillment_status: string | null;
  currency: string;
  total_price: string;
  subtotal_price: string;
  total_tax: string;
  total_discounts: string;
  total_shipping_price_set?: {
    shop_money: {
      amount: string;
      currency_code: string;
    };
  };
  customer?: ShopifyCustomer;
  line_items: ShopifyLineItem[];
  shipping_address?: ShopifyAddress;
  billing_address?: ShopifyAddress;
  note: string | null;
  tags: string;
  source_name: string | null;
}

export interface ShopifyLineItem {
  id: number;
  product_id: number | null;
  variant_id: number | null;
  title: string;
  variant_title: string | null;
  sku: string | null;
  quantity: number;
  price: string;
  total_discount: string;
  fulfillment_status: string | null;
}

export interface ShopifyCheckout {
  id: number;
  token: string;
  email: string | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
  abandoned_checkout_url: string;
  currency: string;
  total_price: string;
  subtotal_price: string;
  total_tax: string;
  line_items: ShopifyLineItem[];
  customer?: ShopifyCustomer;
}

// Shopify API pagination
export interface ShopifyPaginatedResponse<T> {
  data: T[];
  pageInfo?: {
    hasNextPage: boolean;
    hasPreviousPage: boolean;
    startCursor?: string;
    endCursor?: string;
  };
}

// Webhook topics
export type ShopifyWebhookTopic =
  | 'customers/create'
  | 'customers/update'
  | 'customers/delete'
  | 'orders/create'
  | 'orders/updated'
  | 'orders/cancelled'
  | 'orders/fulfilled'
  | 'orders/paid'
  | 'products/create'
  | 'products/update'
  | 'products/delete'
  | 'checkouts/create'
  | 'checkouts/update'
  | 'checkouts/delete';

