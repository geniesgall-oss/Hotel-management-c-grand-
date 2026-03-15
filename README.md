# Hotel Management System

A full-stack hotel management application for tracking room occupancy, guest check-ins/check-outs, payment records, and monthly revenue reports. Built for small hotels with 12 rooms.

## Features

- **Dashboard** — Real-time overview of all rooms (available, occupied, dirty)
- **Check-In** — Register guests with room assignment and payment details
- **Check-Out** — Process departures and collect outstanding dues
- **History** — Browse past 2 months of booking records with full details
- **Monthly Reports** — Revenue summaries with payment method breakdowns
- **Role-based access** — Admin and staff roles with different permissions

## Prerequisites

- [Node.js](https://nodejs.org/) >= 20
- [pnpm](https://pnpm.io/) >= 9

## Getting Started

```bash
# Install dependencies
pnpm install

# Rebuild TypeScript declarations for the API client
pnpm run typecheck:libs

# Start the API server (runs on port 3001 by default)
pnpm --filter @workspace/api-server run dev

# In a separate terminal, start the frontend (runs on port 3000 by default)
pnpm --filter @workspace/hotel-app run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Default Admin Credentials

| Username | Password |
|----------|----------|
| Bhargav  | 00078    |

## Project Structure

```
├── artifacts/
│   ├── api-server/      # Express + SQLite backend
│   └── hotel-app/       # React + Vite + Tailwind frontend
├── lib/
│   └── api-client-react/ # Generated React Query hooks for the API
└── package.json          # pnpm workspace root
```

## Tech Stack

- **Frontend:** React, Vite, Tailwind CSS, Framer Motion, React Query
- **Backend:** Express, SQLite (better-sqlite3), Zod
- **API Client:** Auto-generated with Orval (OpenAPI → React Query hooks)

