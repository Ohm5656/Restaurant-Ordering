import { KitchenBoard } from "@/components/admin/kitchen-board";
import { getAdminContext, getKitchenOrders } from "@/lib/data/admin";

export default async function OrdersPage() {
  const context = await getAdminContext();
  if (!context) return null;
  const orders = await getKitchenOrders(context.restaurantId);
  return (
    <KitchenBoard initialOrders={orders} restaurantId={context.restaurantId} />
  );
}
