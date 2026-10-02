# Restaurant Ordering System

Next.js App Router + Supabase + Tailwind CSS restaurant ordering and table management system.

## Development Server

A Next.js development server normally runs on `$PORT` (default 8443).

- Preview URL: The user can access the running app through the preview panel
- Hot reload: Changes to source files are reflected immediately

## Project Structure

This is the canonical project structure. Start with task-relevant files below. Only follow imports or inspect other files when required, when a documented path is missing, or when the repository contradicts this guide.

- `src/app` - Next.js pages, layouts, and route handlers
- `src/components/customer` - QR customer ordering experience
- `src/components/admin` - Restaurant operations, KDS, menu, tables, staff, and settings
- `src/lib/data` - Server-side read models
- `src/lib/supabase` - Browser, server, and service-role Supabase clients
- `src/index.css` - Global styles and Tailwind CSS v4 import
- `supabase/migrations` - Database schema, RLS policies, RPCs, indexes, and realtime setup
- `scripts/seed-local.mjs` - Idempotent local demo seed
- `tests/e2e` - Playwright desktop and mobile flows
- `package.json` - Next.js build, lint, test, and seed scripts
- `.mise.toml` - Toolchain versions for Node.js and pnpm

## Dependencies

- Runtime: Next.js 16, React 19, and React DOM 19
- Backend: Supabase Postgres, Auth, Storage, Realtime, and RLS
- Styling: Tailwind CSS v4 through PostCSS plus repository CSS
- Testing: Playwright on desktop and mobile Chromium
- Formatting: Prettier

## Styling

`src/app/layout.tsx` imports `src/index.css`. Keep CSS `@import` statements first and put global theme work there. Tailwind is configured through `postcss.config.mjs`.

## Local Supabase

- Start services with `npx supabase start`.
- Apply new migrations with `npx supabase migration up --local`.
- Seed demo data with `npm run seed:local`.
- Never expose `SUPABASE_SERVICE_ROLE_KEY` to client components.

## Code quality

- Use double quotes for strings containing apostrophes (`"We're here to help"`), or escape them in single-quoted strings. An unescaped apostrophe in a single-quoted string breaks the build.
- Ensure JSX tags are closed and braces are balanced.
- Run `npm run lint`, `npm run build`, and `npm run test:e2e` before shipping.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
