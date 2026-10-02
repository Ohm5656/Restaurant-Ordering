import { StaffManager } from "@/components/admin/staff-manager";
import { getAdminContext, getStaffMembers } from "@/lib/data/admin";

export default async function StaffPage() {
  const context = await getAdminContext();
  if (!context) return null;
  return (
    <StaffManager
      members={await getStaffMembers(context.restaurantId)}
      canManage={context.role === "OWNER"}
      currentUserId={context.userId}
    />
  );
}
