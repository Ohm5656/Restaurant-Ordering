import type { Metadata } from "next";

import { CustomerMenu } from "@/components/customer/customer-menu";
import { InvalidSession } from "@/components/customer/invalid-session";
import { getCustomerMenu } from "@/lib/data/customer";

export const metadata: Metadata = { title: "สั่งอาหาร" };

export default async function CustomerOrderPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const menu = await getCustomerMenu(token);

  if (!menu || menu.session.status !== "OPEN") return <InvalidSession />;
  return <CustomerMenu token={token} initialData={menu} />;
}
