# SellerSync 🚀

A modern SaaS platform for Instagram sellers to manage products, track orders, monitor revenue, and organize business operations from one dashboard.

Built as a full-stack web application with authentication, inventory management, order tracking, analytics, and persistent cloud storage.

## Live Demo

🔗 Live: https://seller-sync-nine.vercel.app/ 
🔗 GitHub: https://github.com/Codergirl-cyber/Seller-Sync

📄 Demo guide: `DEMO_README.md`

---

<img width="1880" height="910" alt="image" src="https://github.com/user-attachments/assets/d1f246a3-77ea-42c8-99ad-3ec6007fa905" />



---

## Features

### Authentication
- Email/password signup & login
- Google OAuth login
- Persistent sessions
- Authentication state handling
- Protected app access

### Dashboard
- Revenue overview from live transactions
- 7-day sales chart
- Top products by revenue
- Actionable alerts (unpaid orders, low stock)
- Recent activity feed

### Product Management
- Add and edit products
- Delete products
- Stock management
- Search products
- Inventory status tracking

### Orders
- Create orders
- Automatic stock reduction
- Payment status tracking
- Delivery status tracking
- Customer purchase history
- Pending order alerts

### Transactions
- Transaction management
- Status updates
- Revenue summaries
- Net income calculations

### Customers
- CRM view built from order history
- Repeat buyer and lifetime value stats
- Per-customer order timeline

### UI / UX
- Responsive design with mobile navigation
- Dark mode
- Loading skeletons
- Empty states
- Framer Motion animations
- Error boundaries
- Toast notifications
- Shared component system

---

## Tech Stack

Frontend:
- React 19
- Vite
- React Router
- Framer Motion
- Lucide React

Backend / Database:
- Supabase
- Supabase Auth
- PostgreSQL
- RPC functions

Styling:
- CSS
- Custom design system

---

## Architecture

SellerSync uses:

- React frontend
- Supabase backend-as-a-service
- Client-side state management
- Auth context provider
- Protected application shell
- RPC-based order processing

Flow:

User Login
↓
Dashboard
├── Products
├── Orders
├── Customers
├── Transactions
└── Settings

---

## Installation

Clone the repository:

```bash
git clone https://github.com/Codergirl-cyber/Seller-Sync.git
cd seller-sync
npm install
cp .env.local.example .env
# Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
npm run dev
```

### Environment variables

| Variable | Description |
|----------|-------------|
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon/public key |

### Routes

| Path | Description |
|------|-------------|
| `/` | Marketing landing |
| `/login`, `/signup`, `/forgot-password` | Auth |
| `/dashboard` | Overview & analytics |
| `/products` | Inventory CRUD |
| `/orders` | Order tracking |
| `/customers` | Customer CRM (from orders) |
| `/transactions` | Revenue ledger |
| `/settings` | Store profile |

### Database

Apply RLS policies so each row is scoped to `auth.uid() = user_id`. See `supabase/schema.sql`. The app uses a `create_order_atomic` RPC for order creation with stock deduction.

### Deploy

`npm run build` then deploy `dist` to Vercel. Set the same env vars in your host dashboard.

---

## Portfolio highlights

- Real Supabase auth (email + Google OAuth)
- Multi-tenant queries with `user_id` filtering
- Atomic order + stock RPC
- React Router with protected shell
- Toast feedback and live dashboard metrics from your data
- Dark mode with persisted theme preference
- Customer CRM page aggregated from order history

