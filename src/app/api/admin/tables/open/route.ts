import { NextResponse } from "next/server";
import { z } from "zod";

import { getAdminContext } from "@/lib/data/admin";
import { isSupabaseConfigured } from "@/lib/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const schema = z.object({
  tableId: z.string().min(1),
  guestCount: z.number().int().min(1).max(100).nullable(),
});

export async function POST(request: Request) {
  const context = await getAdminContext();
  if (!context)
    return NextResponse.json(
      { message: "กรุณาเข้าสู่ระบบใหม่" },
      { status: 401 },
    );
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success)
    return NextResponse.json(
      { message: "ข้อมูลเปิดโต๊ะไม่ถูกต้อง" },
      { status: 400 },
    );
  if (!isSupabaseConfigured || context.restaurantId === "demo")
    return NextResponse.json({
      token: "demo",
      sessionId: crypto.randomUUID(),
      orderUrl: new URL("/order/demo", request.url).toString(),
    });
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("open_table", {
    p_table_id: parsed.data.tableId,
    p_guest_count: parsed.data.guestCount,
  });
  if (error || !Array.isArray(data) || !data[0])
    return NextResponse.json(
      {
        message:
          error?.message === "TABLE_ALREADY_OPEN"
            ? "โต๊ะนี้เปิดอยู่แล้ว"
            : "เปิดโต๊ะไม่สำเร็จ",
      },
      { status: 409 },
    );
  const result = data[0] as { session_id: string; token: string };
  return NextResponse.json({
    token: result.token,
    sessionId: result.session_id,
    orderUrl: new URL(`/order/${result.token}`, request.url).toString(),
  });
}
