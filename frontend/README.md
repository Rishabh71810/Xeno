# 🛍️ Xeno Shopify Frontend

Modern dashboard for the Xeno Shopify Data Ingestion & Insights Service, built with Next.js 15, React 19, and Tailwind CSS.

## ✨ Features

- ✅ **Insights Dashboard** - Revenue, orders, customers at a glance
- ✅ **Interactive Charts** - Revenue trends and order visualizations
- ✅ **Top 5 Customers** - Ranked by total spending
- ✅ **Date Range Filtering** - Filter orders by custom date ranges
- ✅ **Quick Date Presets** - Today, Last 7 days, Last 30 days, etc.
- ✅ **Responsive Design** - Works on desktop and mobile
- ✅ **Dark/Light Mode Ready** - Theme support built-in

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- Backend API running (see backend/README.md)

### Installation

```bash
# Navigate to frontend
cd frontend

# Install dependencies
npm install

# Configure environment
echo "NEXT_PUBLIC_API_URL=http://localhost:3001/api" > .env.local

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## 📁 Project Structure

```
frontend/
├── app/                    # Next.js App Router
│   ├── page.tsx           # Home (redirects to dashboard)
│   ├── layout.tsx         # Root layout
│   ├── globals.css        # Global styles
│   ├── login/             # Login page
│   ├── register/          # Registration page
│   └── dashboard/         # Protected dashboard routes
│       ├── page.tsx       # Main dashboard with charts
│       ├── layout.tsx     # Dashboard layout with sidebar
│       ├── customers/     # Customer listing
│       ├── orders/        # Orders with date filtering
│       ├── products/      # Product catalog
│       └── settings/      # User settings
├── components/
│   ├── layout/
│   │   └── sidebar.tsx    # Navigation sidebar
│   └── ui/                # Shadcn/UI components
│       ├── button.tsx
│       ├── card.tsx
│       ├── table.tsx
│       └── ...
├── lib/
│   ├── api.ts             # Axios API client
│   ├── auth-context.tsx   # Authentication context
│   └── utils.ts           # Utility functions
├── public/                # Static assets
├── package.json
├── tailwind.config.ts
└── next.config.ts
```

## 🔧 Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm start` | Run production build |
| `npm run lint` | Run ESLint |

## 📱 Pages

### Public Pages
| Route | Description |
|-------|-------------|
| `/login` | User login |
| `/register` | New user registration |

### Protected Dashboard
| Route | Description |
|-------|-------------|
| `/dashboard` | Overview with stats & charts |
| `/dashboard/customers` | Customer listing with search |
| `/dashboard/orders` | Orders with date filtering |
| `/dashboard/products` | Product catalog |
| `/dashboard/settings` | User settings |

## 🎨 UI Components

Built with [Shadcn/UI](https://ui.shadcn.com/) - a collection of accessible, customizable components:

- **Button** - Primary actions
- **Card** - Content containers
- **Table** - Data display
- **Badge** - Status indicators
- **Input** - Form inputs
- **Avatar** - User avatars
- **Dialog** - Modal dialogs
- **Dropdown Menu** - Action menus
- **Tooltip** - Helpful hints

## 📊 Charts

Using [Recharts](https://recharts.org/) for data visualization:

- **BarChart** - Revenue over time
- **LineChart** - Order trends
- **Responsive containers** - Auto-sizing charts

## 🔐 Authentication

- JWT token-based authentication
- Tokens stored in cookies (httpOnly for security)
- Automatic token refresh
- Protected route middleware

## 🌐 Environment Variables

```env
# Backend API URL
NEXT_PUBLIC_API_URL=http://localhost:3001/api

# For production:
NEXT_PUBLIC_API_URL=https://your-backend.onrender.com/api
```

## 📦 Tech Stack

| Category | Technology |
|----------|------------|
| **Framework** | Next.js 15 (App Router) |
| **UI Library** | React 19 |
| **Styling** | Tailwind CSS 4 |
| **Components** | Shadcn/UI |
| **Charts** | Recharts |
| **HTTP Client** | Axios |
| **Forms** | React Hook Form + Zod |
| **Icons** | Lucide React |

## 🚀 Deployment

### Vercel (Recommended)

1. Import project from GitHub
2. Set root directory: `frontend`
3. Add environment variable:
   - `NEXT_PUBLIC_API_URL` = `https://your-backend.onrender.com/api`
4. Deploy

### Build for Production

```bash
npm run build
npm start
```

## 🎯 Key Features Explained

### Dashboard Overview
- **Stats Cards**: Total revenue, orders, customers, average order value
- **Revenue Chart**: Bar chart showing revenue by day/week/month
- **Orders Trend**: Line chart showing order volume over time
- **Top 5 Customers**: Ranked list of highest-spending customers

### Orders Page
- **Search**: Find orders by number or customer email
- **Date Range Filter**: Custom start and end dates
- **Quick Presets**: Today, Last 7 days, Last 30 days, Last 3 months, Last year
- **Status Badges**: Visual indicators for payment and fulfillment status

### Responsive Design
- Mobile-friendly sidebar (collapsible)
- Responsive tables with horizontal scroll
- Adaptive chart sizing

## 📝 License

MIT

---

Built for the **Xeno FDE Internship Assignment 2025**
