# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: SQLite (better-sqlite3) for hotel app; PostgreSQL + Drizzle ORM available
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Structure

```text
artifacts-monorepo/
├── artifacts/
│   ├── api-server/         # Express API server (port 8080, path /api)
│   ├── hotel-app/          # Hotel Management React+Vite app (port 25164, path /)
│   └── mockup-sandbox/     # UI prototyping sandbox
├── lib/
│   ├── api-spec/           # OpenAPI spec + Orval codegen config
│   ├── api-client-react/   # Generated React Query hooks
│   ├── api-zod/            # Generated Zod schemas from OpenAPI
│   └── db/                 # Drizzle ORM schema + DB connection (PostgreSQL)
├── scripts/
├── pnpm-workspace.yaml
├── tsconfig.base.json
├── tsconfig.json
└── package.json
```

## Hotel Management App

Full-stack hotel management system at `artifacts/hotel-app` (frontend) + `artifacts/api-server` (backend).

### Features
- **Login**: Admin (admin/admin123) and Staff (staff/staff123) roles
- **Dashboard**: 12 rooms (LV1–LV12), green = available, red = occupied, shows due amounts
- **Check-In**: Guest name, Indian +91 phone, room selection, room amount, payment (Cash/PhonePe/GPay/Card), due amount calc
- **Check-Out**: Shows due balance, asks for due payment method before confirming
- **History**: Last 2 months, shows all payment details (checkin + checkout payments, total)
- **Permissions**: Admin can delete bookings and history; Staff check-in/check-out only

### Database (SQLite)
- File: `artifacts/api-server/hotel.db`
- Tables: `users`, `bookings`, `history`
- Bookings track: room_amount, amount_paid, payment_method, due_amount
- History tracks: all payment fields from both checkin and checkout

### Tech
- Frontend: React + Vite + Tailwind (dark theme), React Query hooks from codegen
- Backend: Express 5 + better-sqlite3, session-based auth (in-memory tokens)
- API spec: `lib/api-spec/openapi.yaml` → codegen → `lib/api-client-react/src/generated/api.ts`
