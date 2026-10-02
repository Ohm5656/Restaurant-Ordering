import { NextResponse } from "next/server";
import { z } from "zod";

import { getAdminContext } from "@/lib/data/admin";
import { isSupabaseConfigured } from "@/lib/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const schema = z.object({
  sessionId: z.string().min(1),
  paymentMethod: z.enum(["CASH", "TRANSFER", "CARD", "OTHER"]).nullable(),
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
      { message: "ข้อมูลปิดโต๊ะไม่ถูกต้อง" },
      { status: 400 },
    );
  if (!isSupabaseConfigured || context.restaurantId === "demo")
    return NextResponse.json({ ok: true });
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("close_table", {
    p_session_id: parsed.data.sessionId,
    p_payment_method: parsed.data.paymentMethod,
  });
  if (error)
    return NextResponse.json(
      { message: "ปิดโต๊ะไม่สำเร็จ กรุณาตรวจสอบการชำระเงิน" },
      { status: 409 },
    );
  return NextResponse.json({ ok: true });
}
