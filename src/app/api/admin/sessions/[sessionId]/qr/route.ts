import { NextResponse } from "next/server";

import { getAdminContext } from "@/lib/data/admin";
import { isSupabaseConfigured } from "@/lib/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  const context = await getAdminContext();
  if (!context)
    return NextResponse.json(
      { message: "กรุณาเข้าสู่ระบบใหม่" },
      { status: 401 },
    );
  const { sessionId } = await params;
  if (!isSupabaseConfigured || context.restaurantId === "demo")
    return NextResponse.json({
      orderUrl: new URL("/order/demo", request.url).toString(),
    });
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("get_session_qr_token", {
    p_session_id: sessionId,
  });
  if (error || !data)
    return NextResponse.json(
      { message: "ไม่พบ QR ของโต๊ะนี้" },
      { status: 404 },
    );
  return NextResponse.json({
    orderUrl: new URL(`/order/${data}`, request.url).toString(),
  });
}
