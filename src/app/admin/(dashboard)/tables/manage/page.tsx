import { TableManager } from "@/components/admin/table-manager";
import {
  getAdminContext,
  getRestaurantConfiguration,
  getTableBoard,
} from "@/lib/data/admin";

export default async function ManageTablesPage() {
  const context = await getAdminContext();
  if (!context) return null;
  const [tables, configuration] = await Promise.all([
    getTableBoard(context.restaurantId),
    getRestaurantConfiguration(context.restaurantId),
  ]);
  return <TableManager tables={tables} zones={configuration.zones} />;
}
