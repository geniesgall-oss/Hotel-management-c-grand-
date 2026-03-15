# Hotel C Grand — Management System

A full-stack hotel management application for **Hotel C Grand** (12 rooms: LV1–LV12). Handles room status, guest check-in/check-out, payment tracking, room extras, split payments, staff workflow, and monthly reports.

---

## Features

| Feature | Details |
|---|---|
| **Dashboard** | Live grid of all 12 rooms — Available / Occupied / Dirty |
| **Check-In** | Guest name, Indian phone (+91), room assignment, room amount, advance payment, payment method |
| **Check-Out** | Split payments across Cash, PhonePe, GPay, Card with real-time balance indicator |
| **Room Extras** | Add items (Water, Coke, Pepsi, etc.) to occupied rooms; billed automatically at checkout |
| **History** | Last 2 months of checkout records; admin can edit or delete any entry |
| **Monthly Reports** | Occupancy count + revenue breakdown by payment method |
| **User Management** | Admin-only — create and delete staff / admin accounts |
| **Auto-purge** | History records older than 2 months are permanently deleted on server startup and every 24 hours |
| **Role-based access** | Admin sees all controls; Staff can check-in, check-out, and mark rooms clean |

---

## Prerequisites

- [Node.js](https://nodejs.org/) ≥ 20
- [pnpm](https://pnpm.io/) ≥ 9

---

## Getting Started

```bash
# 1. Install all dependencies
pnpm install

# 2. Rebuild the generated API client (only needed after OpenAPI spec changes)
pnpm --filter @workspace/api-spec run codegen
pnpm tsc -b lib/api-client-react

# 3. Start the API server
pnpm --filter @workspace/api-server run dev

# 4. In a separate terminal, start the frontend
pnpm --filter @workspace/hotel-app run dev
```

Open the URL printed by Vite (usually `http://localhost:5173`).

> The `PORT` environment variable controls which port the API server binds to.  
> Override the database path with `DB_PATH` (default: `artifacts/api-server/hotel.db`).

---

## Default Admin Credentials

| Username | Password |
|----------|----------|
| `Bhargav` | `00078` |

The database is created automatically on first run. The `.db` file is git-ignored.

---

## Project Structure

```
├── artifacts/
│   ├── api-server/          # Express + SQLite backend
│   │   ├── src/
│   │   │   ├── db.ts        # Database setup, migrations, purge function
│   │   │   ├── index.ts     # Server entry — starts server + schedules daily purge
│   │   │   ├── app.ts       # Express app and middleware
│   │   │   └── routes/      # auth, rooms, bookings, history, users
│   │   └── hotel.db         # SQLite database (auto-created, git-ignored)
│   └── hotel-app/           # React + Vite frontend
│       └── src/
│           ├── pages/       # Dashboard, CheckIn, CheckOut, History, MonthlyReport, Users
│           ├── components/  # UI primitives (shadcn/ui) + AppLayout
│           └── hooks/       # useAuth
├── lib/
│   ├── api-spec/            # OpenAPI specification (openapi.yaml)
│   └── api-client-react/    # Auto-generated React Query hooks (via Orval)
└── package.json             # pnpm workspace root
```

---

## Tech Stack

**Frontend**
- React 18 + Vite
- Tailwind CSS + shadcn/ui components
- Framer Motion (animations)
- TanStack Query / React Query
- Wouter (client-side routing)

**Backend**
- Express
- better-sqlite3 (SQLite, zero setup)
- Zod (request validation)
- JWT (session authentication)

**Tooling**
- Orval — OpenAPI → React Query + TypeScript codegen
- TypeScript throughout (strict mode)
- pnpm workspaces (monorepo)

---

## Room State Machine

```
available ──(check-in)──▶ occupied ──(check-out / admin delete)──▶ dirty ──(staff marks clean)──▶ available
```

## Payment Flow

- **Check-In** — record total room amount + advance paid via a single method (Cash, PhonePe, GPay, or Card)
- **During stay** — staff can add room extras (drinks, snacks, etc.) at any time
- **Check-Out** — remaining balance (room due + extras) can be split across multiple payment methods; the Confirm button stays disabled until the split total exactly equals the due amount
