import { NextResponse } from "next/server";
import { z } from "zod";

import { getAdminContext } from "@/lib/data/admin";
import { isSupabaseConfigured } from "@/lib/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const schema = z.object({
  name: z.string().trim().min(1).max(40).optional(),
  capacity: z.number().int().min(1).max(100).optional(),
  zoneId: z.string().optional(),
  active: z.boolean().optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ tableId: string }> },
) {
  const context = await getAdminContext();
  if (!context || !["OWNER", "ADMIN"].includes(context.role))
    return NextResponse.json({ message: "ไม่มีสิทธิ์" }, { status: 403 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success)
    return NextResponse.json(
      { message: "ข้อมูลโต๊ะไม่ถูกต้อง" },
      { status: 400 },
    );
  if (!isSupabaseConfigured || context.restaurantId === "demo")
    return NextResponse.json({ ok: true });
  const { tableId } = await params;
  const supabase = await createSupabaseServerClient();
  if (parsed.data.active === false) {
    const { data: openSession } = await supabase
      .from("table_sessions")
      .select("id")
      .eq("table_id", tableId)
      .eq("status", "OPEN")
      .maybeSingle();
    if (openSession)
      return NextResponse.json(
        { message: "ต้องปิดเซสชันก่อนปิดใช้งานโต๊ะ" },
        { status: 409 },
      );
  }
  if (parsed.data.zoneId) {
    const { data: zone } = await supabase
      .from("zones")
      .select("id")
      .eq("id", parsed.data.zoneId)
      .eq("restaurant_id", context.restaurantId)
      .single();
    if (!zone)
      return NextResponse.json({ message: "ไม่พบโซน" }, { status: 400 });
  }
  const values = {
    ...(parsed.data.name ? { name: parsed.data.name } : {}),
    ...(parsed.data.capacity ? { capacity: parsed.data.capacity } : {}),
    ...(parsed.data.zoneId ? { zone_id: parsed.data.zoneId } : {}),
    ...(parsed.data.active !== undefined ? { active: parsed.data.active } : {}),
  };
  const { error } = await supabase
    .from("restaurant_tables")
    .update(values)
    .eq("id", tableId)
    .eq("restaurant_id", context.restaurantId);
  if (error)
    return NextResponse.json(
      {
        message:
          error.code === "23505"
            ? "ชื่อโต๊ะนี้มีอยู่แล้ว"
            : "อัปเดตโต๊ะไม่สำเร็จ",
      },
      { status: 409 },
    );
  return NextResponse.json({ ok: true });
}
