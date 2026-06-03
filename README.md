# Simzzy

Global eSIM marketplace — browse data plans by destination, build daily/short-trip
plans, check out, and manage eSIMs from a self-serve dashboard, with a full admin
operations center behind role-based access control.

Built as an **npm-workspaces monorepo**: a Next.js full-stack app plus a shared
Prisma/data-layer package.

```
simzzy-final/                 ← npm workspaces root
├── simzzy-frontend/          ← Next.js 16 app (UI + API routes) — the deployable app
├── simzzy-backend/           ← Prisma schema/migrations/seeds + shared client & domain modules (library)
└── docs/                     ← long-form project documentation
```

> `simzzy-backend` is a **workspace library** (it exports the Prisma client and
> domain services via `client.ts`); it is **not** a standalone server. The single
> deployable service is `simzzy-frontend`, whose API routes import the backend.

## Tech stack

- **Next.js 16** (App Router) · **React 19** · **TypeScript** · **Tailwind CSS v4**
- **Auth.js / NextAuth v5** (role-based access control)
- **Prisma 6** over **PostgreSQL (Supabase)**
- eSIM supplier: **tSIM (TSim Tech)** — read-only connectivity verified (Phase 4H.2A)

## Prerequisites

- **Node.js 22 LTS** (see `.nvmrc`) and npm
- A PostgreSQL database (Supabase recommended)

## Local development

```bash
# from the repo root
npm install          # installs all workspaces + regenerates the Prisma client (postinstall)
npm run dev          # Next.js app → http://localhost:3000
npm run build        # production build
npm run db:seed      # seed reference data
```

Database migrations run from the backend workspace:

```bash
npm --workspace simzzy-backend run migrate:dev     # create/apply a dev migration
npm --workspace simzzy-backend run migrate:deploy  # apply migrations (CI/prod)
npm --workspace simzzy-backend run studio          # Prisma Studio
```

## Environment variables

Copy the example files and fill in real values (never commit secrets):

```bash
cp simzzy-frontend/.env.example simzzy-frontend/.env.local
cp simzzy-backend/.env.example  simzzy-backend/.env
```

| Variable | Used by | Purpose |
|---|---|---|
| `DATABASE_URL` | frontend + backend | Postgres pooled connection (Prisma runtime) |
| `DIRECT_URL` | frontend + backend | Direct Postgres connection (Prisma migrate) |
| `AUTH_SECRET` | frontend | NextAuth session/JWT secret (`npx auth secret`) |
| `AUTH_TRUST_HOST` | frontend | Set `true` when behind a proxy (Vercel/Railway) |
| `TSIM_API_HOST` | backend | tSIM API base URL (`https://api.tsimtech.com`) |
| `TSIM_ACCOUNT` | backend | tSIM account id |
| `TSIM_SECRET` | backend | tSIM HMAC secret |

> The `TSIM_*` variables power the read-only provider verification
> (`npm --workspace simzzy-backend run verify:tsim`). Provider fulfilment is not
> yet wired into the app. **Note:** tSIM enforces an IP allowlist — the calling
> server's public IP must be whitelisted by TSim.

## Deployment

This is a single deployable Next.js app inside an npm-workspaces monorepo. Both
Vercel and Railway are supported. The database is external (Supabase).

### Vercel (recommended for Next.js)

1. Import the GitHub repo into Vercel.
2. **Root Directory:** `simzzy-frontend`, and enable
   *"Include source files outside of the Root Directory"* so the workspace root
   (and `simzzy-backend`) is available during install/build.
3. Framework preset: **Next.js** (auto-detected). Install/build/start are detected;
   the root `postinstall` runs `prisma generate`.
4. Add the environment variables from the table above in **Project → Settings →
   Environment Variables**.

### Railway

1. Create a new project from the GitHub repo. Railway reads `railway.json`:
   - **Build:** `npm run build`
   - **Start:** `npm --workspace simzzy-frontend run start`
2. Add the environment variables from the table above.
3. Railway provides `PORT` automatically; `next start` binds to it.

After the first deploy, run migrations against your database:
`npm --workspace simzzy-backend run migrate:deploy`.

## Repository layout notes

- `docs/` — architecture notes and runbooks.
- `simzzy-backend/README.md` — data layer and domain-module responsibilities.
- Build artifacts (`.next/`, `dist/`), `node_modules/`, and all `.env*` files are
  git-ignored; only `.env.example` templates are tracked.
