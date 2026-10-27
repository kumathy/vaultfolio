# Vaultfolio

Vaultfolio turns SnapTrade brokerage data into structured Markdown investing reports, viewable in the browser and synced into an Obsidian vault. It is a SnapTrade OAuth app: SnapTrade Personal users grant read-only access to their accounts.

Current status: SnapTrade sign-in, account overview, sign-out and disconnect (Phase 1). A full reviewer guide covering architecture, security decisions and tradeoffs follows in Phase 5.

## Requirements

- Node.js 24 or later
- A Neon Postgres database (a separate branch for local development)
- A SnapTrade OAuth app with these redirect URIs registered exactly:
  - `http://127.0.0.1:3000/oauth/snaptrade/callback`
  - `https://<deployment>/oauth/snaptrade/callback`

## Local setup

1. Install dependencies: `npm install`
2. Create `.env.local` from `.env.example` and set each value. `SESSION_SECRET` and `TOKEN_ENCRYPTION_KEY` are 32 random bytes each: `openssl rand -base64 32`.
3. Apply the database migrations: `npm run db:migrate`
4. Start the app: `npm run dev`, then open `http://127.0.0.1:3000`.

The app is served on `127.0.0.1`, not `localhost`. Cookies are host-specific, so a callback that arrives on a different host than the sign-in started from fails the state check.

## Scripts

| Script                | Purpose                                            |
| --------------------- | -------------------------------------------------- |
| `npm run dev`         | Development server on 127.0.0.1:3000               |
| `npm run build`       | Production build                                   |
| `npm run check`       | Formatting check, lint, type check and tests       |
| `npm test`            | Unit tests (Vitest)                                |
| `npm run db:generate` | SQL migration from changes to `src/db/schema.ts`   |
| `npm run db:migrate`  | Apply migrations to the database in `DATABASE_URL` |

## Deployment (Vercel)

- Neon is added through the Vercel Marketplace, which sets `DATABASE_URL`.
- The remaining variables from `.env.example` are set in Project Settings → Environment Variables, with values different from local development.
- Migrations run manually against the production database (`npm run db:migrate` with the production `DATABASE_URL`), not during the build.

## Known issues

- `npm audit` reports moderate advisories in `esbuild` through `drizzle-kit`. The advisory affects esbuild's development server, which drizzle-kit does not start, and drizzle-kit is a development-only tool that is not deployed.
