# QR Restaurant Ordering

Full-stack restaurant ordering and table management system built for one restaurant per deployment. Guests scan a QR code, order from their table, call staff, and request the bill. Owners and staff manage live tables, kitchen orders, menus, stock, bills, staff access, and restaurant settings from a responsive admin panel.

![Next.js](https://img.shields.io/badge/Next.js-16-000000?style=for-the-badge&logo=nextdotjs&logoColor=white)
![React](https://img.shields.io/badge/React-19-149ECA?style=for-the-badge&logo=react&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-Postgres_Auth_Realtime-3FCF8E?style=for-the-badge&logo=supabase&logoColor=0B2E1F)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-38BDF8?style=for-the-badge&logo=tailwindcss&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![Playwright](https://img.shields.io/badge/Playwright-E2E-2EAD33?style=for-the-badge&logo=playwright&logoColor=white)

**Tech stack:** Next.js App Router, React Server Components, Supabase Postgres, Supabase Auth, Supabase Storage, Supabase Realtime, PostgreSQL RPC transactions, Row Level Security, Tailwind CSS, TypeScript, Zod, Playwright, Vitest, and Prettier.

The system is designed for real restaurant traffic: QR sessions expire when a table is closed, customer order tracking uses lightweight polling, admin and kitchen screens use realtime updates, stock changes are protected by database transactions, and the table board switches layout automatically for small, medium, and large floor plans. The current target is up to 300 configured tables, around 100 active tables at once, and around 300 connected customer devices, with final capacity depending on the Supabase plan, menu size, realtime usage, and production load testing.

```bash
npm install
npx supabase start
cp .env.example .env.local
npx supabase db reset --local --no-seed
npm run seed:local
npm run dev -- --hostname 127.0.0.1 --port 8443
```

Local demo owner:

```text
owner@savour.local
Demo1234!
```

Cloud setup uses a new Supabase project, then pushes the database schema and configures hosting environment variables:

```bash
npx supabase login
npx supabase link --project-ref YOUR_PROJECT_REF
npx supabase db push
```

```text
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_APP_URL=https://your-domain.example
```

Do not expose `SUPABASE_SERVICE_ROLE_KEY` in client code or commit it to Git. After deployment, open `/admin/setup` to create the restaurant and first owner account.

Main app surfaces are `/order/[token]` for guests, `/admin/tables` for the live floor board, `/admin/orders` for the kitchen display, `/admin/menu` for menu and stock control, `/admin/tables/manage` for table and zone setup, `/admin/history` for bills and sessions, `/admin/staff` for staff access, and `/admin/settings` for restaurant settings. Database schema, policies, storage rules, realtime setup, and transactional RPCs live in `supabase/migrations`.

Quality checks:

```bash
npm run format:check
npm run lint
npm run build
npm run test:e2e
```
