# Xeno Shopify Data Ingestion & Insights Service
## Technical Documentation

**Author:** Rishabh Sharma  
**Date:** 6th December 2025  
**Version:** 1.0

---

## 1. Executive Summary

This document describes the architecture, design decisions, and implementation details of the **Xeno Multi-Tenant Shopify Data Ingestion & Insights Service** - a platform built to help enterprise retailers onboard, integrate, and analyze their Shopify customer data.

The system enables:
- **Seamless Shopify Integration** via Admin API and Webhooks
- **Multi-Tenant Data Isolation** with secure tenant identifiers
- **Real-time Analytics** through an intuitive dashboard
- **Scalable Background Processing** using Redis queues

---

## 2. System Architecture

### 2.1 High-Level Overview

The application follows a **three-tier architecture**:

```
┌─────────────────────────────────────────────────────────────────┐
│                    PRESENTATION LAYER                           │
│                    (Next.js Frontend)                           │
│    Dashboard │ Customers │ Orders │ Products │ Settings         │
└────────────────────────────┬────────────────────────────────────┘
                             │ REST API (HTTPS)
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                    APPLICATION LAYER                            │
│                    (Express.js Backend)                         │
│                                                                 │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │
│  │    Auth     │  │  Ingestion  │  │  Insights   │             │
│  │   Service   │  │   Engine    │  │   Engine    │             │
│  └─────────────┘  └──────┬──────┘  └─────────────┘             │
│                          │                                      │
│                          ▼                                      │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │              BACKGROUND WORKERS (BullMQ)                 │  │
│  │   Customer Sync │ Order Sync │ Product Sync │ Webhooks   │  │
│  └──────────────────────────────────────────────────────────┘  │
└────────────────────────────┬────────────────────────────────────┘
                             │
              ┌──────────────┴──────────────┐
              ▼                              ▼
┌─────────────────────────┐    ┌─────────────────────────┐
│      DATA LAYER         │    │      CACHE LAYER        │
│   PostgreSQL (Supabase) │    │    Redis (Upstash)      │
│                         │    │                         │
│   • Tenant data         │    │   • Job queues          │
│   • Customer records    │    │   • Rate limiting       │
│   • Order history       │    │   • Session cache       │
│   • Product catalog     │    │                         │
└─────────────────────────┘    └─────────────────────────┘
```

### 2.2 Component Details

| Component | Technology | Responsibility |
|-----------|------------|----------------|
| **Frontend** | Next.js 15, React 19 | User interface, authentication, data visualization |
| **Backend API** | Express.js, TypeScript | REST API, business logic, validation |
| **Database** | PostgreSQL | Persistent data storage |
| **ORM** | Prisma | Type-safe database queries, migrations |
| **Queue** | Redis + BullMQ | Async job processing, scheduled tasks |
| **Shopify Client** | Custom HTTP Client | Shopify Admin API integration |

---

## 3. Data Model

### 3.1 Multi-Tenancy Strategy

The system uses a **Shared Database, Shared Schema** approach with a `tenantId` column on all data tables. This provides:

- **Cost Efficiency**: Single database instance for all tenants
- **Simplicity**: No schema replication needed
- **Isolation**: Row-level security via tenant ID filtering

```sql
-- Every query includes tenant filter
SELECT * FROM "Customer" WHERE "tenantId" = $1;
```

### 3.2 Core Entities

| Entity | Description | Key Fields |
|--------|-------------|------------|
| **Tenant** | Represents a Shopify store | `shopifyDomain`, `accessToken` |
| **User** | Dashboard users | `email`, `role`, `tenantId` |
| **Customer** | Synced from Shopify | `shopifyId`, `email`, `totalSpent` |
| **Order** | Order records | `orderNumber`, `totalPrice`, `financialStatus` |
| **Product** | Product catalog | `title`, `vendor`, `minPrice`, `maxPrice` |
| **Event** | Custom events | `eventType` (cart_abandoned, checkout_started) |
| **SyncLog** | Audit trail | `syncType`, `status`, `recordsProcessed` |

### 3.3 Indexing Strategy

Key indexes for performance:
- `Customer(tenantId, email)` - Fast customer lookup
- `Order(tenantId, shopifyCreatedAt)` - Date range queries
- `Order(tenantId, financialStatus)` - Status filtering
- `Product(tenantId, status)` - Active product queries

---

## 4. Data Ingestion

### 4.1 Ingestion Flow

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  Shopify Store  │────>│  Ingestion API  │────>│   Job Queue     │
│                 │     │  (REST + HMAC)  │     │   (BullMQ)      │
└─────────────────┘     └─────────────────┘     └────────┬────────┘
                                                         │
                                                         ▼
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   PostgreSQL    │<────│    Workers      │<────│  Shopify API    │
│   (Upsert)      │     │  (Transform)    │     │  (Paginated)    │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

### 4.2 Sync Types

| Type | Trigger | Frequency | Data |
|------|---------|-----------|------|
| **Full Sync** | Manual / Daily Cron | Once daily (2 AM) | All records |
| **Incremental** | Scheduled | Every 15 minutes | Changed records only |
| **Webhook** | Real-time | On Shopify event | Single record |

### 4.3 Error Handling

- **Retry Logic**: 3 attempts with exponential backoff (5s, 10s, 20s)
- **Dead Letter Queue**: Failed jobs moved for manual review
- **Sync Logs**: Every sync creates an audit record with status and error details

---

## 5. API Design

### 5.1 Authentication

The API uses **JWT (JSON Web Tokens)** with a dual-token strategy:

| Token | Lifetime | Purpose |
|-------|----------|---------|
| Access Token | 7 days | API authorization |
| Refresh Token | 30 days | Token renewal |

### 5.2 Request/Response Format

All endpoints follow a consistent format:

```json
// Success Response
{
  "success": true,
  "message": "Data retrieved successfully",
  "data": { ... }
}

// Error Response
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid email format"
  }
}
```

### 5.3 Rate Limiting

- **Global**: 100 requests per 15 minutes per IP
- **Webhooks**: 50 requests per minute per tenant

---

## 6. Security Considerations

### 6.1 Data Protection

| Mechanism | Implementation |
|-----------|----------------|
| **API Authentication** | JWT with HS256 signing |
| **Password Hashing** | bcrypt with cost factor 12 |
| **Token Encryption** | AES-256-GCM for Shopify tokens |
| **HTTPS Only** | TLS 1.3 enforced in production |

### 6.2 Webhook Verification

Shopify webhooks are verified using HMAC-SHA256:

```typescript
const computedHmac = crypto
  .createHmac('sha256', webhookSecret)
  .update(rawBody, 'utf8')
  .digest('base64');

if (computedHmac !== shopifyHmac) {
  throw new UnauthorizedError('Invalid webhook signature');
}
```

---

## 7. Performance Optimizations

### 7.1 Database

- **Connection Pooling**: PgBouncer mode with 13 connections
- **Batch Processing**: Records processed in batches of 100
- **Selective Queries**: Only required fields selected (no `SELECT *`)

### 7.2 Caching

- **Redis Queues**: Job deduplication prevents duplicate syncs
- **Query Optimization**: Indexed columns for all filter operations

### 7.3 Frontend

- **Server Components**: Next.js 15 App Router with streaming
- **Code Splitting**: Dynamic imports for chart components
- **Optimistic Updates**: Immediate UI feedback on actions

---

## 8. Assumptions Made

1. **Single Store per Tenant**: Each tenant connects to one Shopify store
2. **Shopify Plus Not Required**: Works with basic Shopify Admin API
3. **INR as Display Currency**: Revenue shown in Indian Rupees
4. **UTC Timestamps**: All dates stored in UTC timezone
5. **English Only**: No internationalization in current version

---

## 9. Known Limitations

1. **Offset Pagination**: May be slow for large datasets (>100K records)
2. **No Real-time Dashboard**: Requires manual refresh
3. **Basic Search**: No fuzzy matching or full-text search
4. **No Bulk Actions**: Single record operations only

---

## 10. Future Enhancements

### Short-term (Next Sprint)
- [ ] Cursor-based pagination for scalability
- [ ] WebSocket for real-time dashboard updates
- [ ] Full-text search with PostgreSQL tsvector

### Medium-term (3-6 months)
- [ ] AI-powered customer segmentation
- [ ] Predictive analytics for churn prediction
- [ ] Email campaign integration

### Long-term (6-12 months)
- [ ] Multi-store per tenant support
- [ ] Custom report builder
- [ ] Mobile application

---

## 11. Deployment Checklist

- [ ] Set production environment variables
- [ ] Enable HTTPS/TLS
- [ ] Configure CORS for production domain
- [ ] Set up database backups (daily)
- [ ] Configure monitoring (Sentry, DataDog)
- [ ] Set up log aggregation
- [ ] Configure rate limiting for production load
- [ ] Test webhook endpoints with Shopify

---

## 12. Conclusion

This system provides a robust foundation for Shopify data integration with a clear path for scaling. The multi-tenant architecture ensures data isolation while the background job processing enables reliable data synchronization without blocking user operations.

The modular design allows for easy extension of features, and the comprehensive logging ensures visibility into system health and data sync status.

---

**Document Version:** 1.0  
**Last Updated:** December 2024  
**Contact:** rishabh19772004@gmail.com

