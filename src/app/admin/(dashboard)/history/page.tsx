import { HistoryView } from "@/components/admin/history-view";
import { getAdminContext, getHistory } from "@/lib/data/admin";

export default async function HistoryPage() {
  const context = await getAdminContext();
  if (!context) return null;
  return <HistoryView sessions={await getHistory(context.restaurantId)} />;
}
