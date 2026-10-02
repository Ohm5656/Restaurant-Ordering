import { NextResponse } from "next/server";
import { z } from "zod";

import { getAdminContext } from "@/lib/data/admin";
import { isSupabaseConfigured } from "@/lib/env";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const schema = z.object({
  email: z.string().email(),
  displayName: z.string().trim().min(1).max(100),
  role: z.enum(["ADMIN", "STAFF", "KITCHEN"]),
});

export async function POST(request: Request) {
  const context = await getAdminContext();
  if (!context || context.role !== "OWNER")
    return NextResponse.json(
      { message: "เฉพาะเจ้าของร้านเท่านั้น" },
      { status: 403 },
    );
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success)
    return NextResponse.json(
      { message: "กรุณาตรวจสอบอีเมล ชื่อ และสิทธิ์" },
      { status: 400 },
    );
  if (!isSupabaseConfigured || context.restaurantId === "demo")
    return NextResponse.json({ ok: true });
  try {
    const admin = createSupabaseAdminClient();
    const { data, error } = await admin.auth.admin.inviteUserByEmail(
      parsed.data.email,
      { data: { display_name: parsed.data.displayName } },
    );
    if (error || !data.user)
      return NextResponse.json(
        { message: "ส่งคำเชิญไม่สำเร็จ อีเมลนี้อาจมีบัญชีอยู่แล้ว" },
        { status: 409 },
      );
    const { error: memberError } = await admin
      .from("restaurant_members")
      .insert({
        restaurant_id: context.restaurantId,
        user_id: data.user.id,
        role: parsed.data.role,
        display_name: parsed.data.displayName,
      });
    if (memberError)
      return NextResponse.json(
        { message: "สร้างสิทธิ์พนักงานไม่สำเร็จ" },
        { status: 409 },
      );
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { message: "ยังไม่ได้ตั้งค่า Service Role Key สำหรับส่งคำเชิญ" },
      { status: 503 },
    );
  }
}
