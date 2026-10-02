import { NextResponse } from "next/server";
import { z } from "zod";

import { getAdminContext } from "@/lib/data/admin";
import { isSupabaseConfigured } from "@/lib/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const schema = z.object({
  name: z.string().trim().min(1).max(40),
  capacity: z.number().int().min(1).max(100),
  zoneId: z.string().min(1),
});

export async function POST(request: Request) {
  const context = await getAdminContext();
  if (!context || !["OWNER", "ADMIN"].includes(context.role))
    return NextResponse.json(
      { message: "คุณไม่มีสิทธิ์เพิ่มโต๊ะ" },
      { status: 403 },
    );
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success)
    return NextResponse.json(
      { message: "กรุณากรอกข้อมูลโต๊ะให้ครบ" },
      { status: 400 },
    );
  if (!isSupabaseConfigured || context.restaurantId === "demo")
    return NextResponse.json({ id: crypto.randomUUID() });
  const supabase = await createSupabaseServerClient();
  const { data: zone } = await supabase
    .from("zones")
    .select("id")
    .eq("id", parsed.data.zoneId)
    .eq("restaurant_id", context.restaurantId)
    .single();
  if (!zone)
    return NextResponse.json({ message: "ไม่พบโซนที่เลือก" }, { status: 400 });
  const { data, error } = await supabase
    .from("restaurant_tables")
    .insert({
      restaurant_id: context.restaurantId,
      zone_id: parsed.data.zoneId,
      name: parsed.data.name,
      capacity: parsed.data.capacity,
    })
    .select("id")
    .single();
  if (error)
    return NextResponse.json(
      {
        message:
          error.code === "23505"
            ? "ชื่อโต๊ะนี้มีอยู่แล้ว"
            : "เพิ่มโต๊ะไม่สำเร็จ",
      },
      { status: 409 },
    );
  return NextResponse.json({ id: data.id });
}
