import { NextResponse } from "next/server";
import { z } from "zod";

import { getAdminContext } from "@/lib/data/admin";
import { isSupabaseConfigured } from "@/lib/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const schema = z.object({
  status: z.enum(["ACCEPTED", "PREPARING", "READY", "SERVED", "CANCELLED"]),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ orderId: string }> },
) {
  const context = await getAdminContext();
  if (!context)
    return NextResponse.json(
      { message: "กรุณาเข้าสู่ระบบใหม่" },
      { status: 401 },
    );
  const { orderId } = await params;
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success)
    return NextResponse.json({ message: "สถานะไม่ถูกต้อง" }, { status: 400 });
  if (!isSupabaseConfigured || context.restaurantId === "demo")
    return NextResponse.json({ ok: true });
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("transition_order", {
    p_order_id: orderId,
    p_status: parsed.data.status,
  });
  if (error)
    return NextResponse.json(
      { message: "ไม่สามารถเปลี่ยนสถานะตามลำดับนี้ได้" },
      {
        status: 409,
      },
    );
  return NextResponse.json({ ok: true });
}
