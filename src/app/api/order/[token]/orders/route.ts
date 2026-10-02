import { NextResponse } from "next/server";

import { getCustomerOrders } from "@/lib/data/customer";

export async function GET(
  _: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  return NextResponse.json(
    { orders: await getCustomerOrders(token) },
    { headers: { "Cache-Control": "no-store" } },
  );
}
