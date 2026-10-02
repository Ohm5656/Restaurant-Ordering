import { NextResponse } from "next/server";
import { z } from "zod";

import { getAdminContext } from "@/lib/data/admin";
import { isSupabaseConfigured } from "@/lib/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const schema = z.object({
  role: z.enum(["ADMIN", "STAFF", "KITCHEN"]).optional(),
  active: z.boolean().optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ userId: string }> },
) {
  const context = await getAdminContext();
  if (!context || context.role !== "OWNER")
    return NextResponse.json(
      { message: "เฉพาะเจ้าของร้านเท่านั้น" },
      { status: 403 },
    );
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success)
    return NextResponse.json({ message: "ข้อมูลไม่ถูกต้อง" }, { status: 400 });
  if (!isSupabaseConfigured || context.restaurantId === "demo")
    return NextResponse.json({ ok: true });
  const { userId } = await params;
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("restaurant_members")
    .update(parsed.data)
    .eq("restaurant_id", context.restaurantId)
    .eq("user_id", userId)
    .neq("role", "OWNER");
  if (error)
    return NextResponse.json(
      { message: "อัปเดตพนักงานไม่สำเร็จ" },
      { status: 409 },
    );
  return NextResponse.json({ ok: true });
}
