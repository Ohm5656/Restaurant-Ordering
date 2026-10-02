import { TableBoard } from "@/components/admin/table-board";
import { getAdminContext, getTableBoard } from "@/lib/data/admin";

export default async function TablesPage() {
  const context = await getAdminContext();
  if (!context) return null;
  const tables = await getTableBoard(context.restaurantId);
  return (
    <TableBoard initialTables={tables} restaurantId={context.restaurantId} />
  );
}
