import { RestaurantSettings } from "@/components/admin/restaurant-settings";
import { getAdminContext, getRestaurantConfiguration } from "@/lib/data/admin";

export default async function SettingsPage() {
  const context = await getAdminContext();
  if (!context) return null;
  return (
    <RestaurantSettings
      configuration={await getRestaurantConfiguration(context.restaurantId)}
    />
  );
}
