# Restaurant Ordering System

ระบบสั่งอาหารด้วย QR, จัดการโต๊ะ, ครัว, เมนู, สต็อก, พนักงาน และบิล สำหรับร้านอาหารหนึ่งร้านต่อหนึ่ง deployment

## Stack

- Next.js 16 App Router + React 19
- Supabase Postgres, Auth, Storage และ Realtime
- Row Level Security และ transactional PostgreSQL RPC
- Tailwind CSS 4 + responsive custom UI
- Playwright สำหรับ desktop/mobile E2E

## Local Development

ต้องมี Node.js 22, Docker และ Supabase CLI

```bash
npm install
npx supabase start
cp .env.example .env.local
npx supabase db reset --local --no-seed
npm run seed:local
npm run dev -- --hostname 127.0.0.1 --port 8443
```

บัญชีตัวอย่าง local:

```text
owner@savour.local
Demo1234!
```

Supabase Studio อยู่ที่ `http://127.0.0.1:54323` และหน้าเว็บอยู่ที่ `http://127.0.0.1:8443`

## New Supabase Project

1. สร้าง Supabase project ใหม่ใน region ใกล้ร้าน
2. Link และลง migration ทั้งหมด

```bash
npx supabase login
npx supabase link --project-ref YOUR_PROJECT_REF
npx supabase db push
```

3. ตั้ง Environment Variables ใน Vercel หรือ hosting ที่ใช้

```text
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_APP_URL=https://your-domain.example
```

4. Deploy แล้วเข้า `/admin/setup` เพื่อสร้างร้านและบัญชีเจ้าของครั้งแรก

ห้ามนำ `SUPABASE_SERVICE_ROLE_KEY` ไปใช้ใน Client Component หรือ commit ลง Git

## Verification

```bash
npm run format:check
npm run lint
npm run build
npm run test:e2e
```

## Capacity Target

UI แสดงทุกโต๊ะเมื่อมีไม่เกิน 30 โต๊ะ, เปิดตัวกรองตามโซนอัตโนมัติเมื่อมากกว่า 30 โต๊ะ และใช้ compact view เป็นค่าเริ่มต้นเมื่อมากกว่า 50 โต๊ะ

เป้าหมายที่ออกแบบไว้ต่อร้านคือ 300 โต๊ะที่ตั้งค่าไว้, ประมาณ 100 โต๊ะใช้งานพร้อมกัน และประมาณ 300 อุปกรณ์ลูกค้าที่เชื่อมต่อพร้อมกัน การรองรับจริงขึ้นกับ Supabase plan, จำนวนอุปกรณ์ต่อโต๊ะ, ความถี่ realtime และขนาดเมนู จึงควร load test ด้วยข้อมูลร้านจริงก่อนเปิดใช้งานเต็มกำลัง

## Important Paths

- `/order/[token]` หน้าเมนูลูกค้าจาก QR ที่หมดอายุเมื่อปิดโต๊ะ
- `/admin/tables` ผังและสถานะโต๊ะแบบ realtime
- `/admin/orders` Kitchen Display System
- `/admin/menu` เมนู, สต็อก และตัวเลือกเพิ่มเติม
- `/admin/tables/manage` จัดการโต๊ะและโซน
- `/admin/history` ประวัติเซสชันและบิล
- `/admin/staff` บัญชีและสิทธิ์พนักงาน
- `/admin/settings` ข้อมูลร้านและการตั้งค่าการสั่งอาหาร

ฐานข้อมูลและ policy ทั้งหมดอยู่ใน `supabase/migrations` โดยออเดอร์, การตัด/คืนสต็อก, การเปิด/ปิดโต๊ะ และ modifier ใช้ transaction ฝั่งฐานข้อมูล
