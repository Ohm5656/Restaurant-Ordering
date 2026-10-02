<div align="center">

# QR Restaurant Ordering

Scan. Order. Cook. Serve.

A clean QR restaurant ordering system built with a modern web stack. Guests order from their table, call staff, and request the bill from their phone. Staff manage live tables, kitchen tickets, menus, stock, bills, and restaurant settings from one responsive dashboard.

![Next.js](https://img.shields.io/badge/Next.js-16-000000?style=for-the-badge&logo=nextdotjs&logoColor=white)
![React](https://img.shields.io/badge/React-19-149ECA?style=for-the-badge&logo=react&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-Postgres_Auth_Realtime-3FCF8E?style=for-the-badge&logo=supabase&logoColor=0B2E1F)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-RPC_Transactions-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-38BDF8?style=for-the-badge&logo=tailwindcss&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![Zod](https://img.shields.io/badge/Zod-Schema_Validation-3068B7?style=for-the-badge&logo=zod&logoColor=white)
![Playwright](https://img.shields.io/badge/Playwright-E2E-2EAD33?style=for-the-badge&logo=playwright&logoColor=white)
![Vercel](https://img.shields.io/badge/Vercel-Deploy_Ready-000000?style=for-the-badge&logo=vercel&logoColor=white)

</div>

**Tech stack:** Next.js 16 App Router | React 19 | TypeScript | Supabase Postgres, Auth, Storage, and Realtime | PostgreSQL RPC transactions | Row Level Security | Tailwind CSS 4 | Zod | Playwright | Vitest | Prettier

Supabase is the core backend. Postgres stores restaurant data, Auth protects staff access, Storage handles menu assets, Realtime powers live admin updates, and database transactions keep orders, bills, stock deduction, and stock restore reliable. The customer side stays lightweight for QR traffic, while the admin table board adapts between full, zone-based, and compact layouts for larger restaurants.

Run it locally:

```bash
npm install
cp .env.example .env.local
npx supabase start
npx supabase db reset --local --no-seed
npm run seed:local
npm run dev -- --hostname 127.0.0.1 --port 8443
```

Deploy it by linking a Supabase project, pushing migrations with `npx supabase db push`, and setting `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, and `NEXT_PUBLIC_APP_URL` in the hosting provider. Keep `SUPABASE_SERVICE_ROLE_KEY` server-side only. After deployment, open `/admin/setup` to create the restaurant and first owner account.

Useful routes: `/order/[token]`, `/admin/tables`, `/admin/orders`, `/admin/menu`, `/admin/tables/manage`, `/admin/history`, `/admin/staff`, and `/admin/settings`. Quality checks: `npm run format:check`, `npm run lint`, `npm run build`, and `npm run test:e2e`.
