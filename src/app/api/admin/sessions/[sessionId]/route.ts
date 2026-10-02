import { NextResponse } from "next/server";

import { getAdminContext } from "@/lib/data/admin";
import { isSupabaseConfigured } from "@/lib/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(
  _: Request,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  const context = await getAdminContext();
  if (!context)
    return NextResponse.json(
      { message: "กรุณาเข้าสู่ระบบใหม่" },
      { status: 401 },
    );
  const { sessionId } = await params;

  if (!isSupabaseConfigured || context.restaurantId === "demo") {
    return NextResponse.json({
      orders: [
        {
          id: "demo-order",
          number: 1048,
          status: "PREPARING",
          createdAt: new Date(Date.now() - 12 * 60_000).toISOString(),
          items: [
            { name: "เนื้อย่างวากิว", quantity: 2, note: null },
            { name: "Ruby Citrus", quantity: 1, note: "ไม่หวาน" },
          ],
        },
      ],
      calls: [],
    });
  }

  const supabase = await createSupabaseServerClient();
  const { data: session } = await supabase
    .from("table_sessions")
    .select("id")
    .eq("id", sessionId)
    .eq("restaurant_id", context.restaurantId)
    .maybeSingle();
  if (!session)
    return NextResponse.json(
      { message: "ไม่พบโต๊ะที่กำลังใช้งาน" },
      { status: 404 },
    );

  const [
    { data: orderRows, error: orderError },
    { data: callRows, error: callError },
  ] = await Promise.all([
    supabase
      .from("orders")
      .select(
        "id,order_number,status,created_at,order_items(menu_name_snapshot,quantity,note)",
      )
      .eq("table_session_id", sessionId)
      .neq("status", "CANCELLED")
      .order("created_at", { ascending: false }),
    supabase
      .from("staff_calls")
      .select("id,type,status,created_at")
      .eq("table_session_id", sessionId)
      .eq("status", "OPEN")
      .order("created_at"),
  ]);
  if (orderError || callError)
    return NextResponse.json(
      { message: "โหลดรายละเอียดโต๊ะไม่สำเร็จ" },
      {
        status: 500,
      },
    );

  return NextResponse.json({
    orders: (orderRows ?? []).map((order) => ({
      id: String(order.id),
      number: Number(order.order_number),
      status: String(order.status),
      createdAt: String(order.created_at),
      items: (
        order.order_items as unknown as Array<{
          menu_name_snapshot: string;
          quantity: number;
          note: string | null;
        }>
      ).map((item) => ({
        name: item.menu_name_snapshot,
        quantity: item.quantity,
        note: item.note,
      })),
    })),
    calls: (callRows ?? []).map((call) => ({
      id: String(call.id),
      type: String(call.type),
      createdAt: String(call.created_at),
    })),
  });
}
