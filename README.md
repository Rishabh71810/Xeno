# 🛍️ Xeno - Multi-Tenant Shopify Data Ingestion & Insights Service

A production-ready, multi-tenant platform that connects to Shopify stores, ingests customer, order, and product data, and provides actionable business insights through an intuitive dashboard.

![Node.js](https://img.shields.io/badge/Node.js-18+-green?logo=node.js)
![Next.js](https://img.shields.io/badge/Next.js-15-black?logo=next.js)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15+-blue?logo=postgresql)
![Redis](https://img.shields.io/badge/Redis-7+-red?logo=redis)
![TypeScript](https://img.shields.io/badge/TypeScript-5+-blue?logo=typescript)

## 📋 Table of Contents

- [Features](#-features)
- [Architecture](#-architecture)
- [Tech Stack](#-tech-stack)
- [Database Schema](#-database-schema)
- [API Endpoints](#-api-endpoints)
- [Setup Instructions](#-setup-instructions)
- [Environment Variables](#-environment-variables)
- [Deployment](#-deployment)
- [Assumptions & Limitations](#-assumptions--limitations)

---

## ✨ Features

### ✅ Core Features
- **Multi-Tenant Architecture** - Isolated data per Shopify store with tenant identifiers
- **Shopify Data Ingestion** - Sync customers, orders, and products via Shopify Admin API
- **Real-time Webhooks** - Instant updates for customer/order/product changes
- **Scheduled Sync** - Automatic incremental (15-min) and full daily syncs
- **Background Job Processing** - Redis + BullMQ for async data processing

### ✅ Insights Dashboard
- **Revenue Analytics** - Total revenue, trends over time
- **Order Metrics** - Order counts, status distribution, date filtering
- **Customer Insights** - Top 5 customers by spend, customer growth
- **Products Overview** - Product catalog with inventory status

### ✅ Security & Auth
- **JWT Authentication** - Secure token-based auth with refresh tokens
- **Role-Based Access** - Admin, Manager, Viewer roles
- **Encrypted Credentials** - AES-256 encryption for Shopify tokens

### ✅ Bonus Features
- **Custom Events** - Cart abandoned, checkout started tracking
- **Date Range Filtering** - Filter orders by custom date ranges
- **Quick Date Presets** - Today, Last 7 days, Last 30 days, etc.

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              FRONTEND (Next.js 15)                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │
│  │   Dashboard  │  │   Customers  │  │    Orders    │  │   Products   │    │
│  │   (Charts)   │  │    Table     │  │  Date Filter │  │    Table     │    │
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘    │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                            BACKEND (Express.js)                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │
│  │     Auth     │  │   Ingestion  │  │   Insights   │  │   Webhooks   │    │
│  │   Module     │  │    Service   │  │   Service    │  │   Handler    │    │
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘    │
│                           │                                    │            │
│                           ▼                                    ▼            │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │                    Background Jobs (BullMQ)                          │  │
│  │   ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌────────────┐    │  │
│  │   │ Customer   │  │   Order    │  │  Product   │  │  Webhook   │    │  │
│  │   │  Worker    │  │   Worker   │  │  Worker    │  │  Worker    │    │  │
│  │   └────────────┘  └────────────┘  └────────────┘  └────────────┘    │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
                    │                                           │
                    ▼                                           ▼
    ┌───────────────────────────┐           ┌───────────────────────────┐
    │    PostgreSQL (Supabase)  │           │    Redis (Upstash)        │
    │    - Tenants              │           │    - Job Queues           │
    │    - Users                │           │    - Rate Limiting        │
    │    - Customers            │           │    - Session Cache        │
    │    - Orders               │           └───────────────────────────┘
    │    - Products             │
    │    - Events               │
    │    - SyncLogs             │
    └───────────────────────────┘
                    ▲
                    │
    ┌───────────────────────────┐
    │      Shopify Store        │
    │    - Admin API            │
    │    - Webhooks             │
    └───────────────────────────┘
```

### Data Flow

1. **Initial Sync**: User connects Shopify store → Full sync triggered → Data ingested via Shopify Admin API
2. **Real-time Updates**: Shopify sends webhook → Backend validates HMAC → Data upserted
3. **Scheduled Sync**: Cron job (every 15 min) → Incremental sync for all active tenants
4. **Analytics**: User requests insights → Aggregated queries on PostgreSQL → Charts rendered

---

## 🛠️ Tech Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| **Frontend** | Next.js 15, React 19 | Dashboard UI with App Router |
| **UI Components** | Shadcn/UI, Tailwind CSS | Modern, accessible components |
| **Charts** | Recharts | Interactive data visualizations |
| **Backend** | Node.js, Express.js | REST API server |
| **Database** | PostgreSQL (Supabase) | Primary data store |
| **ORM** | Prisma | Type-safe database queries |
| **Queue** | Redis + BullMQ | Background job processing |
| **Auth** | JWT (jsonwebtoken) | Stateless authentication |
| **Validation** | Zod | Request/response validation |
| **Logging** | Winston | Structured logging |

---

## 📊 Database Schema

### Entity Relationship Diagram

```
┌─────────────┐       ┌─────────────┐       ┌─────────────┐
│   Tenant    │──────<│    User     │       │   Product   │
│             │       │             │       │             │
│ id          │       │ id          │       │ id          │
│ name        │       │ email       │       │ shopifyId   │
│ shopifyDom  │       │ password    │       │ title       │
│ accessToken │       │ role        │       │ vendor      │
│ webhookSecr │       │ tenantId ──>│       │ price       │
│ lastSyncAt  │       │             │       │ tenantId ──>│
└──────┬──────┘       └─────────────┘       └──────┬──────┘
       │                                          │
       │                                          │
       ▼                                          ▼
┌─────────────┐       ┌─────────────┐       ┌─────────────┐
│  Customer   │──────<│    Order    │──────<│  OrderItem  │
│             │       │             │       │             │
│ id          │       │ id          │       │ id          │
│ shopifyId   │       │ shopifyId   │       │ orderId ───>│
│ email       │       │ orderNumber │       │ productId ─>│
│ firstName   │       │ totalPrice  │       │ title       │
│ totalSpent  │       │ financialSt │       │ quantity    │
│ tenantId ──>│       │ customerId >│       │ price       │
└─────────────┘       │ tenantId ──>│       └─────────────┘
                      └─────────────┘
       │
       ▼
┌─────────────┐       ┌─────────────┐
│   Event     │       │   SyncLog   │
│             │       │             │
│ id          │       │ id          │
│ eventType   │       │ syncType    │
│ shopifyId   │       │ status      │
│ totalPrice  │       │ recordsProc │
│ tenantId ──>│       │ tenantId ──>│
└─────────────┘       └─────────────┘
```

### Key Tables

| Table | Description |
|-------|-------------|
| `Tenant` | Shopify stores (multi-tenant root) |
| `User` | Dashboard users with roles |
| `Customer` | Synced Shopify customers |
| `Order` | Synced Shopify orders |
| `OrderItem` | Line items for each order |
| `Product` | Synced Shopify products |
| `Event` | Custom events (cart abandoned, etc.) |
| `SyncLog` | Sync history and status tracking |

---

## 🔌 API Endpoints

### Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/auth/register` | Register new user |
| `POST` | `/api/auth/login` | Login and get tokens |
| `POST` | `/api/auth/logout` | Logout and revoke token |
| `GET` | `/api/auth/me` | Get current user |
| `POST` | `/api/auth/refresh` | Refresh access token |

### Data APIs

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/customers` | List customers (paginated) |
| `GET` | `/api/customers/:id` | Get customer by ID |
| `GET` | `/api/orders` | List orders with filters |
| `GET` | `/api/orders/:id` | Get order details |
| `GET` | `/api/products` | List products |
| `GET` | `/api/products/:id` | Get product by ID |

### Insights APIs

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/insights/overview` | Dashboard metrics |
| `GET` | `/api/insights/revenue` | Revenue over time |
| `GET` | `/api/insights/top-customers` | Top 5 customers by spend |
| `GET` | `/api/insights/orders-by-date` | Orders grouped by date |
| `GET` | `/api/insights/customer-growth` | Customer growth trend |

### Ingestion APIs

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/ingestion/sync` | Trigger full sync |
| `POST` | `/api/ingestion/sync/customers` | Sync customers only |
| `POST` | `/api/ingestion/sync/orders` | Sync orders only |
| `POST` | `/api/ingestion/sync/products` | Sync products only |
| `GET` | `/api/ingestion/status` | Get sync status |
| `GET` | `/api/ingestion/logs` | Get sync history |

### Webhooks

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/webhooks/shopify/customers/create` | Customer created |
| `POST` | `/api/webhooks/shopify/customers/update` | Customer updated |
| `POST` | `/api/webhooks/shopify/orders/create` | Order created |
| `POST` | `/api/webhooks/shopify/orders/updated` | Order updated |
| `POST` | `/api/webhooks/shopify/products/create` | Product created |
| `POST` | `/api/webhooks/shopify/checkouts/create` | Checkout started |

---

## 🚀 Setup Instructions

### Prerequisites

- Node.js 18+
- PostgreSQL database (or Supabase account)
- Redis instance (or Upstash account)
- Shopify development store

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/xeno-shopify.git
cd xeno-shopify
```

### 2. Backend Setup

```bash
cd backend
npm install

# Copy environment file
cp env.example .env
# Edit .env with your values (see Environment Variables section)

# Generate Prisma client
npm run db:generate

# Push schema to database
npm run db:push

# Seed demo data (optional)
npm run db:seed

# Start development server
npm run dev
```

### 3. Frontend Setup

```bash
cd frontend
npm install

# Start development server
npm run dev
```

### 4. Access the Application

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3001
- **Health Check**: http://localhost:3001/health

---

## 🔐 Environment Variables

### Backend (`backend/.env`)

```env
# Server
NODE_ENV=development
PORT=3001
API_PREFIX=/api

# Database (Supabase PostgreSQL)
DATABASE_URL="postgresql://postgres:[PASSWORD]@db.[PROJECT].supabase.co:5432/postgres"
DIRECT_URL="postgresql://postgres:[PASSWORD]@db.[PROJECT].supabase.co:5432/postgres"

# Redis (Upstash - Required)
REDIS_URL="rediss://default:[PASSWORD]@[ENDPOINT].upstash.io:6379"

# JWT Authentication
JWT_SECRET="your-32-character-secret-key-here"
JWT_EXPIRES_IN="7d"
JWT_REFRESH_SECRET="another-32-character-secret-key"
JWT_REFRESH_EXPIRES_IN="30d"

# Encryption (for Shopify tokens)
ENCRYPTION_KEY="32-character-encryption-key-here!"

# Shopify
SHOPIFY_API_VERSION="2024-01"

# CORS
CORS_ORIGINS="http://localhost:3000"

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Logging
LOG_LEVEL=debug
```

### Frontend (`frontend/.env.local`)

```env
NEXT_PUBLIC_API_URL=http://localhost:3001/api
```

---

## 🌐 Deployment

### Recommended Platforms

| Service | Component | Notes |
|---------|-----------|-------|
| **Vercel** | Frontend | Zero-config Next.js deployment |
| **Railway** | Backend | Easy Node.js + Redis deployment |
| **Supabase** | Database | Free PostgreSQL with connection pooling |
| **Upstash** | Redis | Serverless Redis, free tier available |

### Quick Deploy

1. **Frontend on Vercel**:
   - Connect GitHub repo
   - Set `NEXT_PUBLIC_API_URL` to your backend URL

2. **Backend on Railway**:
   - Create new project from GitHub
   - Add PostgreSQL and Redis services
   - Set environment variables

---

## ⚠️ Assumptions & Limitations

### Assumptions Made

1. **Single Store per Tenant**: Each tenant manages one Shopify store
2. **Admin API Access**: Users have Shopify Admin API credentials
3. **INR Currency**: Prices displayed in Indian Rupees (₹)
4. **UTC Timezone**: All dates stored and processed in UTC

### Current Limitations

1. **No Pagination Cursor**: Uses offset-based pagination (not cursor-based)
2. **Basic Search**: Text search without full-text indexing
3. **No Real-time Dashboard**: Dashboard doesn't auto-refresh
4. **Limited Error Recovery**: Failed syncs require manual retry

### Next Steps to Productionize

1. **Add Cursor Pagination** for large datasets
2. **Implement Full-Text Search** with PostgreSQL tsvector
3. **Add WebSocket Support** for real-time dashboard updates
4. **Implement Retry Queue** for failed webhook processing
5. **Add Monitoring** with Sentry, DataDog, or similar
6. **Add Rate Limit per Tenant** to prevent API abuse
7. **Implement Audit Logging** for compliance
8. **Add E2E Tests** with Playwright or Cypress

---

## 📄 License

MIT License - see [LICENSE](LICENSE) for details.

---

## 👤 Author

**Rishabh Sharma**
- GitHub: [@rishabh-sharma](https://github.com/rishabh-sharma)
- Email: rishabh19772004@gmail.com

---

Built with ❤️ for the Xeno FDE Internship Assignment 2025

