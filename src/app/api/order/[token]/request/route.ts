import { NextResponse } from "next/server";
import { z } from "zod";

import { isSupabaseConfigured } from "@/lib/env";
import { createSupabaseAnonClient } from "@/lib/supabase/anon";

const schema = z.object({ type: z.enum(["ASSISTANCE", "BILL"]) });

export async function POST(
  request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success)
    return NextResponse.json({ message: "คำขอไม่ถูกต้อง" }, { status: 400 });
  if (!isSupabaseConfigured || token === "demo")
    return NextResponse.json({ requestId: crypto.randomUUID() });
  const supabase = createSupabaseAnonClient();
  const { data, error } = await supabase.rpc("create_customer_request", {
    p_token: token,
    p_type: parsed.data.type,
  });
  if (error)
    return NextResponse.json(
      { message: "ส่งคำขอไม่สำเร็จ กรุณาติดต่อพนักงาน" },
      { status: 409 },
    );
  return NextResponse.json({ requestId: data });
}
