// Re-export types
export * from './shopify.types.js';

// Common types used across the application

export interface JwtPayload {
  userId: string;
  email: string;
  tenantId: string;
  role: string;
  iat?: number;
  exp?: number;
}

export interface RefreshTokenPayload {
  userId: string;
  tokenVersion?: number;
  iat?: number;
  exp?: number;
}

// Pagination types
export interface PaginationQuery {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface DateRangeQuery {
  startDate?: string;
  endDate?: string;
}

// Sync job types
export interface SyncJobData {
  tenantId: string;
  syncType: 'CUSTOMERS' | 'ORDERS' | 'PRODUCTS' | 'FULL';
  triggeredBy?: string;
  options?: {
    fullSync?: boolean;
    sinceId?: string;
    createdAtMin?: string;
    createdAtMax?: string;
  };
}

// Webhook job types
export interface WebhookJobData {
  tenantId: string;
  topic: string;
  shopifyDomain: string;
  payload: unknown;
  receivedAt: string;
}


