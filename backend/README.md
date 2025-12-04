# Xeno Shopify Backend

Multi-tenant Shopify Data Ingestion & Insights Service backend built with Node.js, Express, Prisma, and Redis.

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- PostgreSQL (Supabase recommended)
- Redis (optional, for background jobs)

### Installation

1. **Install dependencies**
   ```bash
   cd backend
   npm install
   ```

2. **Configure environment**
   ```bash
   # Copy example env file
   cp env.example .env
   
   # Edit .env with your values
   ```

3. **Setup database**
   ```bash
   # Generate Prisma client
   npm run db:generate
   
   # Push schema to database
   npm run db:push
   
   # Seed demo data (optional)
   npm run db:seed
   ```

4. **Start development server**
   ```bash
   npm run dev
   ```

The server will start at `http://localhost:3001`

## 📁 Project Structure

```
backend/
├── src/
│   ├── config/           # Configuration (db, redis, env)
│   ├── middleware/       # Express middlewares
│   ├── modules/          # Feature modules
│   │   ├── auth/         # Authentication
│   │   ├── tenant/       # Tenant management
│   │   ├── customers/    # Customer data
│   │   ├── orders/       # Order data
│   │   ├── products/     # Product data
│   │   ├── insights/     # Analytics
│   │   ├── ingestion/    # Data sync
│   │   └── shopify/      # Shopify integration
│   ├── jobs/             # Background jobs & scheduler
│   ├── utils/            # Utilities
│   ├── types/            # TypeScript types
│   ├── app.ts            # Express app
│   └── server.ts         # Entry point
├── prisma/
│   ├── schema.prisma     # Database schema
│   └── seed.ts           # Seed data
├── package.json
└── tsconfig.json
```

## 🔧 Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server with hot reload |
| `npm run build` | Build for production |
| `npm start` | Run production build |
| `npm run db:generate` | Generate Prisma client |
| `npm run db:push` | Push schema to database |
| `npm run db:migrate` | Run migrations (dev) |
| `npm run db:seed` | Seed demo data |
| `npm run db:studio` | Open Prisma Studio |

## 🔌 API Endpoints

### Health Check
- `GET /health` - Server health
- `GET /api/health` - API health

### Authentication (Phase 2)
- `POST /api/auth/register` - Register user
- `POST /api/auth/login` - Login
- `POST /api/auth/logout` - Logout
- `GET /api/auth/me` - Current user
- `POST /api/auth/refresh` - Refresh token

### Data (Phase 4)
- `GET /api/customers` - List customers
- `GET /api/orders` - List orders
- `GET /api/products` - List products

### Insights (Phase 6)
- `GET /api/insights/overview` - Dashboard metrics
- `GET /api/insights/revenue` - Revenue trends
- `GET /api/insights/top-customers` - Top customers

### Webhooks (Phase 4)
- `POST /api/webhooks/shopify/*` - Shopify webhooks

## 🗄️ Database Schema

### Core Tables
- **Tenant** - Multi-tenant stores
- **User** - Users with roles (ADMIN, MANAGER, VIEWER)

### Shopify Data
- **Customer** - Synced customer data
- **Product** - Synced product catalog
- **Order** - Synced orders
- **OrderItem** - Order line items
- **Event** - Custom events (abandoned carts, etc.)

### Sync Tracking
- **SyncLog** - Sync history and status

## 🔐 Environment Variables

See `env.example` for all required variables:
- Database URL (Supabase PostgreSQL)
- Redis URL (for background jobs)
- JWT secrets
- Encryption key
- CORS origins

## 📦 Tech Stack

- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **Database**: PostgreSQL (Supabase)
- **ORM**: Prisma
- **Queue**: BullMQ + Redis
- **Auth**: JWT
- **Validation**: Zod
- **Logging**: Winston

## 🏗️ Development Phases

- [x] Phase 1: Project setup, schema, basic server
- [ ] Phase 2: Authentication module
- [ ] Phase 3: Tenant management
- [ ] Phase 4: Shopify integration & webhooks
- [ ] Phase 5: Data ingestion with Redis
- [ ] Phase 6: Insights & analytics
- [ ] Phase 7: Scheduler & sync

## 📝 License

MIT

