import { NextResponse } from "next/server";
import { z } from "zod";

import { getAdminContext } from "@/lib/data/admin";
import { isSupabaseConfigured } from "@/lib/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const restaurantSchema = z.object({
  name: z.string().trim().min(1).max(120),
  contactNumber: z.string().trim().max(40),
  address: z.string().trim().max(1000),
  timezone: z.literal("Asia/Bangkok"),
});

export async function POST(request: Request) {
  const context = await getAdminContext();
  if (!context || context.role !== "OWNER")
    return NextResponse.json(
      { message: "เฉพาะเจ้าของร้านเท่านั้น" },
      { status: 403 },
    );
  const formData = await request.formData();
  const section = formData.get("section");
  if (!isSupabaseConfigured || context.restaurantId === "demo")
    return NextResponse.json({ ok: true });
  const supabase = await createSupabaseServerClient();
  if (section === "restaurant") {
    const parsed = restaurantSchema.safeParse(
      Object.fromEntries(formData.entries()),
    );
    if (!parsed.success)
      return NextResponse.json(
        { message: "กรุณาตรวจสอบข้อมูลร้าน" },
        { status: 400 },
      );
    const { error } = await supabase
      .from("restaurants")
      .update({
        name: parsed.data.name,
        contact_number: parsed.data.contactNumber || null,
        address: parsed.data.address || null,
        timezone: parsed.data.timezone,
      })
      .eq("id", context.restaurantId);
    if (error)
      return NextResponse.json(
        { message: "บันทึกข้อมูลร้านไม่สำเร็จ" },
        { status: 409 },
      );
  } else if (section === "ordering") {
    const { error } = await supabase
      .from("restaurant_settings")
      .update({
        allow_notes: formData.get("allowNotes") === "on",
        enable_staff_call: formData.get("enableStaffCall") === "on",
        enable_bill_request: formData.get("enableBillRequest") === "on",
        enable_stock_tracking: formData.get("enableStockTracking") === "on",
        show_sold_out_items: formData.get("showSoldOutItems") === "on",
        require_payment_before_close:
          formData.get("requirePaymentBeforeClose") === "on",
      })
      .eq("restaurant_id", context.restaurantId);
    if (error)
      return NextResponse.json(
        { message: "บันทึกการตั้งค่าไม่สำเร็จ" },
        { status: 409 },
      );
  } else
    return NextResponse.json(
      { message: "ส่วนการตั้งค่าไม่ถูกต้อง" },
      { status: 400 },
    );
  return NextResponse.json({ ok: true });
}
