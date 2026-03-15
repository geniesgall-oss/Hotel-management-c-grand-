# Hotel C Grand — Management System

A full-stack hotel management web app for managing 12 rooms (LV1–LV12) with check-in/check-out, real-time room status, payment tracking, booking history, and monthly reports.

## Features

- **Dashboard** — Live status of all 12 rooms (Available / Occupied / Dirty)
- **Check-In** — Register guests with Indian mobile numbers (+91), room amount, and payment method (Cash / PhonePe / GPay / Card)
- **Check-Out** — Process departures and collect any remaining due amount
- **Room Lifecycle** — Checkout marks a room Dirty; staff manually marks it Clean before it becomes Available again
- **History** — Last 2 months of checkout records; admins can edit guest details, amounts, and dates
- **Monthly Report** — Revenue and occupancy summary with payment method breakdown for any selected month
- **User Management** — Admin-only page to add and manage staff accounts
- **Roles** — Admin (full access) and Staff (no user management, no booking edits)

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + Vite + Tailwind CSS |
| Backend | Express 5 + TypeScript |
| Database | SQLite via `better-sqlite3` |
| API contract | OpenAPI 3.1 with Orval codegen |
| Monorepo | pnpm workspaces |

## Prerequisites

- **Node.js** ≥ 20
- **pnpm** ≥ 9 — install with `npm install -g pnpm`

## Getting Started

### 1. Install dependencies

```bash
pnpm install
```

### 2. Start the API server

```bash
pnpm --filter @workspace/api-server run dev
```

The API server starts on **port 8080** by default. The SQLite database (`hotel.db`) is created automatically on first run inside `artifacts/api-server/`.

### 3. Start the frontend

```bash
pnpm --filter @workspace/hotel-app run dev
```

The frontend starts on **port 3000** by default. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Default Login

| Field | Value |
|-------|-------|
| Username | `Bhargav` |
| Password | `00078` |
| Role | Admin |

## Environment Variables

Both the API server and the frontend work out of the box with no configuration. The following variables are optional overrides:

### API Server (`artifacts/api-server/`)

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `8080` | Port the API server listens on |
| `DB_PATH` | Auto-resolved next to the server entry file | Absolute path to the SQLite database file |

### Frontend (`artifacts/hotel-app/`)

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3000` | Port the Vite dev server listens on |
| `BASE_PATH` | `/` | URL base path (used for sub-path deployments) |

## Project Structure

```
.
├── artifacts/
│   ├── api-server/          # Express backend
│   │   ├── src/
│   │   │   ├── db.ts        # SQLite setup & migrations
│   │   │   ├── index.ts     # Server entry point
│   │   │   └── routes/      # API route handlers
│   │   └── build.ts         # esbuild production bundler
│   └── hotel-app/           # React frontend
│       └── src/
│           ├── pages/       # Page components
│           ├── components/  # Shared UI components
│           └── hooks/       # Custom React hooks
└── lib/
    ├── api-spec/            # OpenAPI 3.1 spec + Orval config
    ├── api-client-react/    # Auto-generated React Query hooks
    └── api-zod/             # Auto-generated Zod schemas
```

## Building for Production

```bash
# Build the API server (outputs artifacts/api-server/dist/index.cjs)
pnpm --filter @workspace/api-server run build

# Build the frontend (outputs artifacts/hotel-app/dist/public/)
pnpm --filter @workspace/hotel-app run build
```

Run the production API server:
```bash
node artifacts/api-server/dist/index.cjs
```

## Regenerating the API Client

After changing `lib/api-spec/openapi.yaml`:

```bash
pnpm --filter @workspace/api-spec run codegen
pnpm tsc -b lib/api-client-react
```
