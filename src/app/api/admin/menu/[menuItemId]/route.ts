import { NextResponse } from "next/server";

import { getAdminContext } from "@/lib/data/admin";
import { isSupabaseConfigured } from "@/lib/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function DELETE(
  _: Request,
  { params }: { params: Promise<{ menuItemId: string }> },
) {
  const context = await getAdminContext();
  if (!context || !["OWNER", "ADMIN"].includes(context.role))
    return NextResponse.json({ message: "ไม่มีสิทธิ์" }, { status: 403 });
  if (!isSupabaseConfigured || context.restaurantId === "demo")
    return NextResponse.json({ ok: true });
  const { menuItemId } = await params;
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("menu_items")
    .update({ active: false, available: false })
    .eq("id", menuItemId)
    .eq("restaurant_id", context.restaurantId);
  if (error)
    return NextResponse.json({ message: "ซ่อนเมนูไม่สำเร็จ" }, { status: 409 });
  return NextResponse.json({ ok: true });
}
