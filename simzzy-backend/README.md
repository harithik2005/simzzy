# simzzy-backend

The Simzzy backend layer. Owns the **Prisma schema, migrations, seeds, and the shared Prisma client**, and will house future **domain modules** (auth, plans, pricing, orders, payments, eSIM, etc.) as the platform grows.

It is the **`simzzy-backend` npm workspace package** inside the Simzzy monorepo. The Next.js frontend imports the Prisma client from this package by name:

```ts
import { prisma, Role } from 'simzzy-backend'
```

---

## Where things live in the monorepo

```
simzzy-final/                  ← npm workspaces root
├── simzzy-frontend/           ← Next.js 16 app (UI + API routes today)
├── simzzy-backend/            ← THIS package
│   ├── client.ts              ← exports the Prisma client singleton + enums/types
│   ├── prisma/
│   │   ├── schema.prisma      ← single source of truth for the DB shape
│   │   ├── migrations/        ← Prisma migration history
│   │   ├── seed.ts            ← reference data seeder
│   │   └── seed-superadmin.ts ← idempotent SUPER_ADMIN seeder
│   ├── src/                   ← future domain modules (placeholders today)
│   │   ├── auth/  users/  plans/  pricing/  orders/  payments/
│   │   ├── esim/  admin/  analytics/  settings/  support/  health/
│   │   ├── common/            ← shared utils
│   │   └── config/            ← env-driven config (auth, tsim, eximpe, resend, currency)
│   ├── package.json
│   ├── tsconfig.json
│   ├── .env                   ← DATABASE_URL / DIRECT_URL (gitignored)
│   └── README.md
└── docs/
```

## Responsibilities

| Layer | Owns |
|---|---|
| **simzzy-frontend** | UI, pages, components, public storefront + admin panel, NextAuth wiring, API route handlers (today) |
| **simzzy-backend** | Prisma schema, migrations, seeds, the shared Prisma client, future domain services (auth, pricing engine, order lifecycle, provider adapters, analytics rollups, etc.) |
| **Supabase PostgreSQL** | Source of truth for data; managed via Prisma migrations |

## Scripts

Run from `simzzy-backend/` (or `npm --workspace simzzy-backend run <script>` from the monorepo root):

| Script | What it does |
|---|---|
| `npm run format` | `prisma format` — rewrite the schema with canonical formatting |
| `npm run validate` | `prisma validate` — schema must compile |
| `npm run generate` | `prisma generate` — regenerate the Prisma client (also runs as the monorepo's `postinstall`) |
| `npm run db:pull` | `prisma db pull` — introspect the live DB (use with care; will rewrite the schema) |
| `npm run studio` | Open Prisma Studio for browsing data |
| `npm run migrate:dev` | Create + apply a new migration locally |
| `npm run migrate:deploy` | Apply pending migrations in production |
| `npm run seed` | Seed reference data (idempotent) |
| `npm run db:seed` | Same, invoked via `prisma db seed` |
| `npm run seed:superadmin` | Idempotently upsert the SUPER_ADMIN (reads `SUPERADMIN_NAME/EMAIL/PASSWORD` from env) |

## Environment

`simzzy-backend/.env` (gitignored):

```
DATABASE_URL="postgresql://postgres:<pwd>@db.<project>.supabase.co:5432/postgres"
DIRECT_URL="postgresql://postgres:<pwd>@db.<project>.supabase.co:5432/postgres"
```

`DATABASE_URL` is what the Prisma client uses at runtime; `DIRECT_URL` is what Prisma Migrate uses. Both point at Supabase. URL-encode reserved characters in the password (`%` → `%25`, `+` → `%2B`, `@` → `%40`).

## Development workflow

From the **monorepo root** (`simzzy-final/`):

```bash
npm install            # installs all workspaces + regenerates Prisma client (postinstall)
npm run dev            # starts the Next.js app on http://localhost:3000
npm run build          # production build of the Next.js app
npm run db:seed        # seeds reference data (currencies, regions, providers, settings, global rule)
```

For migrations / schema changes (do these from `simzzy-backend/`):

```bash
cd simzzy-backend
npm run validate                                # always validate first
npm run migrate:dev -- --name <descriptive>     # create + apply a new migration
```

## Phase status (today)

- ✅ Phase 4A — Seed Infrastructure complete (reference data seeded).
- ✅ Phase 4B — Authentication Foundation complete (NextAuth v5 + Prisma adapter + bcryptjs; lives in the frontend today; the helpers may migrate into `src/auth/` here in a future phase).
- ✅ Phase 4G — Admin Operations Center complete. Every admin page is backed by a real service in `src/admin/` (dashboard, users, orders, providers, pricing, support, audit, health, **faqs, plans, payments, reviews, settings**) and an RBAC-gated `/api/admin/*` route. Shared audit writer + `AdminError` live in `src/admin/_shared.ts`. Per-key SUPER_ADMIN gating on production toggles (`maintenance_mode`, `provider_sandbox_mode`) and provider configuration.
- 🚧 Live provider integrations (tSIM ordering — Phase 4H; EximPe payments) and email (Phase 4I) remain mocked/deferred.

## Future direction

The `src/<domain>/` modules will gradually take on:
- **auth/** — server-side helpers + future role management API
- **plans/** — tSIM catalog sync + plan querying
- **pricing/** — fixed-dollar profit engine + override resolution
- **orders/** — order state machine + provider orchestration
- **payments/** — gateway adapters (Dummy / EximPe / Stripe / PayPal)
- **esim/** — QR generation + activation
- **admin/** — admin-only mutations + audit logging
- **analytics/** — daily metric rollups
- **support/** — ticket lifecycle
- **settings/** — site-wide settings reader/writer
- **health/** — service heartbeat
- **common/** — shared types/utils
- **config/** — provider client configuration
