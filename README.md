# QR Restaurant Ordering

A QR-based restaurant ordering and operations app. Guests order from their table, while staff manage tables, kitchen orders, menus, and bills in a live admin dashboard.

![Next.js](https://img.shields.io/badge/Next.js-16-000000?style=for-the-badge&logo=nextdotjs&logoColor=white)
![React](https://img.shields.io/badge/React-19-149ECA?style=for-the-badge&logo=react&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-Postgres_Auth_Realtime-3FCF8E?style=for-the-badge&logo=supabase&logoColor=0B2E1F)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-38BDF8?style=for-the-badge&logo=tailwindcss&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![Playwright](https://img.shields.io/badge/Playwright-E2E-2EAD33?style=for-the-badge&logo=playwright&logoColor=white)

**Stack:** Next.js App Router · React · TypeScript · Supabase (Postgres, Auth, Storage, Realtime) · Tailwind CSS · Zod · Playwright

Supabase handles data, authentication, and realtime updates; PostgreSQL transactions protect order and stock changes. The interface is built with React and Tailwind CSS, with Playwright for end-to-end tests.

## Run locally

```bash
pnpm install
cp .env.example .env.local
npx supabase start
npx supabase db reset --local --no-seed
pnpm seed:local
pnpm dev -- --hostname 127.0.0.1 --port 8443
```

For deployment, link a Supabase project and run `npx supabase db push`. Set `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, and `NEXT_PUBLIC_APP_URL`; keep the service role key server-side. Create the first restaurant and owner at `/admin/setup`.

Run checks with `pnpm lint`, `pnpm build`, and `pnpm test:e2e`.
