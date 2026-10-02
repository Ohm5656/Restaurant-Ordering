import { NextResponse } from "next/server";
import { z } from "zod";

import { getAdminContext } from "@/lib/data/admin";
import { isSupabaseConfigured } from "@/lib/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const schema = z.object({
  name: z.string().trim().min(1).max(80).optional(),
  sortOrder: z.number().int().optional(),
  active: z.boolean().optional(),
  direction: z.union([z.literal(-1), z.literal(1)]).optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ zoneId: string }> },
) {
  const context = await getAdminContext();
  if (!context || !["OWNER", "ADMIN"].includes(context.role))
    return NextResponse.json({ message: "ไม่มีสิทธิ์" }, { status: 403 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success)
    return NextResponse.json({ message: "ข้อมูลไม่ถูกต้อง" }, { status: 400 });
  if (!isSupabaseConfigured || context.restaurantId === "demo")
    return NextResponse.json({ ok: true });
  const { zoneId } = await params;
  const values = {
    ...(parsed.data.name ? { name: parsed.data.name } : {}),
    ...(parsed.data.sortOrder !== undefined
      ? { sort_order: parsed.data.sortOrder }
      : {}),
    ...(parsed.data.active !== undefined ? { active: parsed.data.active } : {}),
  };
  const supabase = await createSupabaseServerClient();
  if (parsed.data.direction) {
    const { error } = await supabase.rpc("reorder_zone", {
      p_zone_id: zoneId,
      p_direction: parsed.data.direction,
    });
    if (error)
      return NextResponse.json(
        { message: "เลื่อนโซนไม่สำเร็จ" },
        { status: 409 },
      );
    return NextResponse.json({ ok: true });
  }
  const { error } = await supabase
    .from("zones")
    .update(values)
    .eq("id", zoneId)
    .eq("restaurant_id", context.restaurantId);
  if (error)
    return NextResponse.json(
      { message: "อัปเดตโซนไม่สำเร็จ" },
      { status: 409 },
    );
  return NextResponse.json({ ok: true });
}
