import { MenuManager } from "@/components/admin/menu-manager";
import { getAdminContext, getMenuManagement } from "@/lib/data/admin";

export default async function MenuPage() {
  const context = await getAdminContext();
  if (!context) return null;
  const data = await getMenuManagement(context.restaurantId);
  return <MenuManager {...data} />;
}
