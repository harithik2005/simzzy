# Simzzy — Project Documentation

This folder hosts long-form project documentation (architecture decisions, runbooks, API specs, etc.) as the platform grows.

## Monorepo overview

```
simzzy-final/                  ← npm workspaces root
├── simzzy-frontend/           ← Next.js 16 app (UI + API routes today)
├── simzzy-backend/            ← Prisma schema, migrations, seeds, shared client + future domain services
└── docs/                      ← THIS folder
```

See [`simzzy-backend/README.md`](../simzzy-backend/README.md) for the data layer and folder responsibilities, and the frontend project for the UI/storefront.

## Development workflow

```bash
# from simzzy-final/
npm install        # installs all workspaces + regenerates Prisma client
npm run dev        # Next.js app on http://localhost:3000
npm run build      # production build
npm run db:seed    # seeds reference data
```

Run schema migrations from `simzzy-backend/` (`npm run migrate:dev`).
