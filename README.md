# IntelliShelf — Smart Inventory System

A full-stack inventory management system built with Next.js 14 (frontend) and Express + Prisma (backend), backed by a Supabase PostgreSQL database.

---

## Project Structure

```
smart_inventory_system/
├── frontend/        # Next.js 14 app (TypeScript, Tailwind CSS, shadcn/ui)
├── backend/         # Express API (TypeScript, Prisma, JWT auth)
├── package.json     # Root — runs both with concurrently
```

---

## Prerequisites

- **Node.js** v18 or higher
- **npm** v9 or higher
- Access to the shared **Supabase project** (get credentials from the team lead)

---

## First-Time Setup (after cloning or pulling)

Run these steps **every time you pull changes** that include backend or schema updates.

### 1. Install dependencies

```bash
# From the project root — installs root, frontend, and backend deps
npm install
npm install --prefix frontend
npm install --prefix backend
```

> The backend `postinstall` script automatically runs `prisma generate` after `npm install --prefix backend`, so the Prisma client is always regenerated.

### 2. Set up environment variables

Copy the example files and fill in the credentials (ask the team lead for the Supabase connection strings and JWT secret):

```bash
# Backend
copy backend\.env.example backend\.env

# Frontend
copy frontend\.env.example frontend\.env
```

**`backend/.env`** — fill in:
```
DATABASE_URL="postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-1-ap-southeast-2.pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-1-ap-southeast-2.pooler.supabase.com:5432/postgres"
JWT_SECRET="<shared secret from team lead>"
CORS_ORIGIN="http://localhost:3000"
JWT_EXPIRES_IN="8h"
```

**`frontend/.env`** — default is fine for local dev:
```
NEXT_PUBLIC_API_URL=http://localhost:4000
```

### 3. Apply database migrations

Run this whenever new migrations are added (any time `backend/prisma/migrations/` has new folders after a pull):

```bash
npm run migrate --prefix backend
```

This applies all pending migrations to the shared Supabase database.

### 4. Start the development servers

```bash
# From the project root — starts both frontend and backend together
npm run dev
```

Or start them separately:

```bash
# Backend only (http://localhost:4000)
npm run dev --prefix backend

# Frontend only (http://localhost:3000)
npm run dev --prefix frontend
```

---

## Common Commands

| Command | What it does |
|---|---|
| `npm run dev` | Start both frontend and backend |
| `npm run dev --prefix backend` | Start backend only |
| `npm run dev --prefix frontend` | Start frontend only |
| `npm run migrate --prefix backend` | Apply pending DB migrations |
| `npm run seed --prefix backend` | Seed the database with sample data |
| `npm run lint` | Run TypeScript checks on both |
| `npm run test --prefix backend` | Run backend tests |
| `npm run test --prefix frontend` | Run frontend tests |

---

## After Pulling Changes — Quick Checklist

```
[ ] npm install --prefix backend    (regenerates Prisma client via postinstall)
[ ] npm install --prefix frontend   (installs any new frontend packages)
[ ] npm run migrate --prefix backend  (applies any new DB migrations)
[ ] npm run dev                     (start the app)
```

---

## Demo Accounts (Development Only)

| Role | Username | Password |
|---|---|---|
| Admin | `admin` | `password123` |
| Branch Manager (Manila) | `manila_manager` | `manila2024` |
| Branch Manager (Cebu) | `cebu_manager` | `cebu2024` |
| Branch Manager (Davao) | `davao_manager` | `davao2024` |
| Staff (Manila) | `manila_staff` | `staff123` |
| Staff (Cebu) | `cebu_staff` | `staff123` |
| Staff (Davao) | `davao_staff` | `staff123` |

---

## Troubleshooting

### `@prisma/client` errors or missing types after pulling
```bash
npm install --prefix backend
# postinstall runs prisma generate automatically
```

### `Cannot find module` or TypeScript errors in backend
```bash
npm run lint --prefix backend
```

### Database is out of sync / migration errors
```bash
npm run migrate --prefix backend
```

### Port already in use
- Backend runs on **4000** — kill any process using that port
- Frontend runs on **3000** — kill any process using that port
