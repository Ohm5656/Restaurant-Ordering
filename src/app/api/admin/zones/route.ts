import { NextResponse } from "next/server";
import { z } from "zod";

import { getAdminContext } from "@/lib/data/admin";
import { isSupabaseConfigured } from "@/lib/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const schema = z.object({ name: z.string().trim().min(1).max(80) });

export async function POST(request: Request) {
  const context = await getAdminContext();
  if (!context || !["OWNER", "ADMIN"].includes(context.role))
    return NextResponse.json({ message: "ไม่มีสิทธิ์" }, { status: 403 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success)
    return NextResponse.json({ message: "ชื่อโซนไม่ถูกต้อง" }, { status: 400 });
  if (!isSupabaseConfigured || context.restaurantId === "demo")
    return NextResponse.json({ id: crypto.randomUUID() });
  const supabase = await createSupabaseServerClient();
  const { data: last } = await supabase
    .from("zones")
    .select("sort_order")
    .eq("restaurant_id", context.restaurantId)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();
  const { data, error } = await supabase
    .from("zones")
    .insert({
      restaurant_id: context.restaurantId,
      name: parsed.data.name,
      sort_order: Number(last?.sort_order ?? 0) + 10,
    })
    .select("id")
    .single();
  if (error)
    return NextResponse.json(
      {
        message:
          error.code === "23505" ? "มีชื่อโซนนี้แล้ว" : "เพิ่มโซนไม่สำเร็จ",
      },
      { status: 409 },
    );
  return NextResponse.json({ id: data.id });
}
