import { NextResponse } from "next/server";

import { getAdminContext } from "@/lib/data/admin";
import { isSupabaseConfigured } from "@/lib/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function POST(
  _: Request,
  { params }: { params: Promise<{ callId: string }> },
) {
  const context = await getAdminContext();
  if (!context || !["OWNER", "ADMIN", "STAFF"].includes(context.role))
    return NextResponse.json(
      { message: "คุณไม่มีสิทธิ์รับคำเรียกนี้" },
      { status: 403 },
    );
  if (!isSupabaseConfigured || context.restaurantId === "demo")
    return NextResponse.json({ ok: true });

  const { callId } = await params;
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("acknowledge_staff_call", {
    p_call_id: callId,
  });
  if (error)
    return NextResponse.json(
      { message: "รับทราบคำเรียกไม่สำเร็จ" },
      {
        status: 409,
      },
    );
  return NextResponse.json({ ok: true });
}
