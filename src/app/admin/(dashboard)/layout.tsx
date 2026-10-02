import { redirect } from "next/navigation";

import { AdminShell } from "@/components/admin/admin-shell";
import { getAdminContext } from "@/lib/data/admin";

export default async function AdminDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const context = await getAdminContext();
  if (!context) redirect("/admin/setup");
  return <AdminShell context={context}>{children}</AdminShell>;
}
