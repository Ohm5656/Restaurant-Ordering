import { NextResponse } from "next/server";
import { z } from "zod";

import { isSupabaseConfigured } from "@/lib/env";
import { createSupabaseAnonClient } from "@/lib/supabase/anon";

const bodySchema = z.object({
  items: z
    .array(
      z.object({
        menuItemId: z.string().min(1),
        quantity: z.number().int().min(1).max(99),
        note: z.string().max(300).default(""),
        modifierIds: z.array(z.string()).max(20).default([]),
      }),
    )
    .min(1)
    .max(50),
});

const errorMessages: Record<string, string> = {
  SESSION_CLOSED_OR_INVALID: "QR นี้หมดอายุหรือโต๊ะปิดแล้ว กรุณาติดต่อพนักงาน",
  BILL_ALREADY_REQUESTED:
    "โต๊ะนี้ขอเช็กบิลแล้ว กรุณาติดต่อพนักงานหากต้องการสั่งเพิ่ม",
  ITEM_UNAVAILABLE: "มีเมนูที่ไม่พร้อมจำหน่าย กรุณาตรวจสอบตะกร้าอีกครั้ง",
  INSUFFICIENT_STOCK: "มีเมนูเหลือไม่พอตามจำนวนที่เลือก กรุณาปรับจำนวน",
  INVALID_MODIFIER_SELECTION: "กรุณาเลือกตัวเลือกอาหารให้ครบ",
};

export async function POST(
  request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success)
    return NextResponse.json(
      { message: "ข้อมูลออเดอร์ไม่ถูกต้อง" },
      { status: 400 },
    );
  if (!isSupabaseConfigured || token === "demo")
    return NextResponse.json({ orderId: crypto.randomUUID() });

  const supabase = createSupabaseAnonClient();
  const { data, error } = await supabase.rpc("submit_customer_order", {
    p_token: token,
    p_items: parsed.data.items.map((item) => ({
      menu_item_id: item.menuItemId,
      quantity: item.quantity,
      note: item.note,
      modifier_ids: item.modifierIds,
    })),
  });
  if (error)
    return NextResponse.json(
      {
        message:
          errorMessages[error.message] ?? "ส่งออเดอร์ไม่สำเร็จ กรุณาลองใหม่",
      },
      { status: 409 },
    );
  return NextResponse.json({ orderId: data });
}
