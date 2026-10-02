export type StaffRole = "OWNER" | "ADMIN" | "STAFF" | "KITCHEN";
export type SessionStatus = "OPEN" | "CLOSED";
export type OrderStatus =
  | "NEW"
  | "ACCEPTED"
  | "PREPARING"
  | "READY"
  | "SERVED"
  | "CANCELLED";
export type TableOperationalState =
  | "AVAILABLE"
  | "ACTIVE"
  | "NEW_ORDER"
  | "PREPARING"
  | "READY"
  | "CALLING_STAFF"
  | "REQUEST_BILL";

export interface ModifierOption {
  id: string;
  name: string;
  priceDeltaSatang: number;
}

export interface ModifierGroup {
  id: string;
  name: string;
  required: boolean;
  minSelections: number;
  maxSelections: number;
  options: ModifierOption[];
}

export interface MenuItem {
  id: string;
  categoryId: string;
  name: string;
  description: string;
  priceSatang: number;
  imageUrl: string | null;
  recommended: boolean;
  available: boolean;
  trackStock: boolean;
  soldOut: boolean;
  stockQuantity: number | null;
  lowStockThreshold: number | null;
  modifierGroups: ModifierGroup[];
}

export interface MenuCategory {
  id: string;
  name: string;
  sortOrder: number;
}

export interface CustomerMenuData {
  restaurant: { id: string; name: string; logoUrl: string | null };
  session: {
    id: string;
    tableName: string;
    status: SessionStatus;
    billRequested: boolean;
  };
  settings: {
    allowNotes: boolean;
    enableStaffCall: boolean;
    enableBillRequest: boolean;
  };
  categories: MenuCategory[];
  items: MenuItem[];
}

export interface CustomerOrder {
  id: string;
  number: number;
  status: OrderStatus;
  createdAt: string;
  items: Array<{
    name: string;
    quantity: number;
    note: string | null;
    unitPriceSatang: number;
    modifiers: Array<{ name: string; priceDeltaSatang: number }>;
  }>;
}

export interface TableSummary {
  id: string;
  name: string;
  seats: number;
  zoneId: string;
  zoneName: string;
  state: TableOperationalState;
  sessionId: string | null;
  openedAt: string | null;
  guestCount: number | null;
  totalSatang: number;
  attentionCount: number;
  latestItems: string[];
}

export interface OrderTicket {
  id: string;
  number: number;
  tableName: string;
  status: OrderStatus;
  createdAt: string;
  note: string | null;
  items: Array<{ name: string; quantity: number; note: string | null }>;
}

export function formatBaht(satang: number) {
  return new Intl.NumberFormat("th-TH", {
    style: "currency",
    currency: "THB",
    minimumFractionDigits: satang % 100 === 0 ? 0 : 2,
  }).format(satang / 100);
}
