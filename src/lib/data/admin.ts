import "server-only";

import { z } from "zod";

import { demoMenu, demoOrders, demoTables } from "@/lib/demo-data";
import { isSupabaseConfigured } from "@/lib/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type {
  MenuCategory,
  MenuItem,
  ModifierGroup,
  OrderTicket,
  StaffRole,
  TableSummary,
} from "@/lib/types";

export interface AdminContext {
  restaurantId: string;
  restaurantName: string;
  userId: string;
  displayName: string;
  role: StaffRole;
}

export interface HistorySession {
  id: string;
  tableName: string;
  openedAt: string;
  closedAt: string;
  guestCount: number | null;
  paymentMethod: string | null;
  orderCount: number;
  orderNumbers: number[];
  totalSatang: number;
}

export interface RestaurantConfiguration {
  restaurant: {
    name: string;
    contactNumber: string;
    address: string;
    timezone: string;
  };
  settings: {
    allowNotes: boolean;
    enableStaffCall: boolean;
    enableBillRequest: boolean;
    enableStockTracking: boolean;
    showSoldOutItems: boolean;
    requirePaymentBeforeClose: boolean;
  };
  zones: Array<{
    id: string;
    name: string;
    sortOrder: number;
    tableCount: number;
  }>;
}

export interface StaffMember {
  userId: string;
  displayName: string;
  role: StaffRole;
  active: boolean;
  createdAt: string;
}

export interface SessionBill {
  sessionId: string;
  tableName: string;
  restaurantName: string;
  openedAt: string;
  items: Array<{
    name: string;
    quantity: number;
    unitPriceSatang: number;
    modifierTotalSatang: number;
  }>;
  totalSatang: number;
}

const membershipSchema = z.object({
  restaurant_id: z.string().uuid(),
  user_id: z.string().uuid(),
  display_name: z.string(),
  role: z.enum(["OWNER", "ADMIN", "STAFF", "KITCHEN"]),
  restaurants: z.object({ name: z.string() }),
});

const tableBoardSchema = z.array(
  z.object({
    id: z.string().uuid(),
    name: z.string(),
    seats: z.number(),
    zone_id: z.string().uuid(),
    zone_name: z.string(),
    state: z.enum([
      "AVAILABLE",
      "ACTIVE",
      "NEW_ORDER",
      "PREPARING",
      "READY",
      "CALLING_STAFF",
      "REQUEST_BILL",
    ]),
    session_id: z.string().uuid().nullable(),
    opened_at: z.string().nullable(),
    guest_count: z.number().nullable(),
    total_satang: z.number(),
    attention_count: z.number(),
    latest_items: z.array(z.string()),
  }),
);

export async function getAdminContext(): Promise<AdminContext | null> {
  if (!isSupabaseConfigured)
    return {
      restaurantId: "demo",
      restaurantName: "SAVOUR",
      userId: "demo",
      displayName: "Narin P.",
      role: "OWNER",
    };
  const supabase = await createSupabaseServerClient();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) return null;
  const { data, error } = await supabase
    .from("restaurant_members")
    .select("restaurant_id,user_id,display_name,role,restaurants!inner(name)")
    .eq("user_id", authData.user.id)
    .eq("active", true)
    .limit(1)
    .maybeSingle();
  if (error || !data) return null;
  const parsed = membershipSchema.safeParse(data);
  if (!parsed.success) return null;
  return {
    restaurantId: parsed.data.restaurant_id,
    restaurantName: parsed.data.restaurants.name,
    userId: parsed.data.user_id,
    displayName: parsed.data.display_name,
    role: parsed.data.role,
  };
}

export async function getTableBoard(
  restaurantId: string,
): Promise<TableSummary[]> {
  if (!isSupabaseConfigured || restaurantId === "demo") return demoTables;
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("get_table_board", {
    p_restaurant_id: restaurantId,
  });
  if (error || !data) return [];
  const parsed = tableBoardSchema.safeParse(data);
  if (!parsed.success) return [];
  return parsed.data.map((table) => ({
    id: table.id,
    name: table.name,
    seats: table.seats,
    zoneId: table.zone_id,
    zoneName: table.zone_name,
    state: table.state,
    sessionId: table.session_id,
    openedAt: table.opened_at,
    guestCount: table.guest_count,
    totalSatang: table.total_satang,
    attentionCount: table.attention_count,
    latestItems: table.latest_items,
  }));
}

export async function getKitchenOrders(
  restaurantId: string,
): Promise<OrderTicket[]> {
  if (!isSupabaseConfigured || restaurantId === "demo") return demoOrders;
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("orders")
    .select(
      "id,order_number,status,created_at,table_sessions!inner(restaurant_tables!inner(name)),order_items(menu_name_snapshot,quantity,note)",
    )
    .eq("restaurant_id", restaurantId)
    .in("status", ["NEW", "ACCEPTED", "PREPARING", "READY"])
    .order("created_at", { ascending: true });
  if (error || !Array.isArray(data)) return [];
  return data.map((row) => {
    const session = row.table_sessions as unknown as {
      restaurant_tables: { name: string };
    };
    const items = row.order_items as unknown as Array<{
      menu_name_snapshot: string;
      quantity: number;
      note: string | null;
    }>;
    return {
      id: String(row.id),
      number: Number(row.order_number),
      tableName: session.restaurant_tables.name,
      status: row.status as OrderTicket["status"],
      createdAt: String(row.created_at),
      note: null,
      items: items.map((item) => ({
        name: item.menu_name_snapshot,
        quantity: item.quantity,
        note: item.note,
      })),
    };
  });
}

export async function getMenuManagement(
  restaurantId: string,
): Promise<{ categories: MenuCategory[]; items: MenuItem[] }> {
  if (!isSupabaseConfigured || restaurantId === "demo")
    return { categories: demoMenu.categories, items: demoMenu.items };
  const supabase = await createSupabaseServerClient();
  const [{ data: categoryRows }, { data: itemRows }] = await Promise.all([
    supabase
      .from("categories")
      .select("id,name,sort_order")
      .eq("restaurant_id", restaurantId)
      .eq("active", true)
      .order("sort_order"),
    supabase
      .from("menu_items")
      .select(
        "id,category_id,name,description,price_satang,image_path,recommended,available,track_stock,stock_quantity,low_stock_threshold",
      )
      .eq("restaurant_id", restaurantId)
      .eq("active", true)
      .order("sort_order"),
  ]);
  const categories = (categoryRows ?? []).map((row) => ({
    id: String(row.id),
    name: String(row.name),
    sortOrder: Number(row.sort_order),
  }));
  const itemIds = (itemRows ?? []).map((row) => String(row.id));
  const [groupResult, optionResult, linkResult] = await Promise.all([
    supabase
      .from("modifier_groups")
      .select("id,name,required,min_selections,max_selections,sort_order")
      .eq("restaurant_id", restaurantId)
      .eq("active", true)
      .order("sort_order"),
    supabase
      .from("modifiers")
      .select("id,group_id,name,price_delta_satang,sort_order")
      .eq("restaurant_id", restaurantId)
      .eq("active", true)
      .order("sort_order"),
    itemIds.length
      ? supabase
          .from("menu_item_modifier_groups")
          .select("menu_item_id,modifier_group_id,sort_order")
          .in("menu_item_id", itemIds)
          .order("sort_order")
      : Promise.resolve({ data: [] }),
  ]);
  const groupRows = groupResult.data ?? [];
  const optionRows = optionResult.data ?? [];
  const linkRows = linkResult.data ?? [];
  const items = (itemRows ?? []).map((row) => ({
    id: String(row.id),
    categoryId: String(row.category_id),
    name: String(row.name),
    description: String(row.description),
    priceSatang: Number(row.price_satang),
    imageUrl: row.image_path
      ? String(row.image_path).startsWith("https://")
        ? String(row.image_path)
        : `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/restaurant-assets/${row.image_path}`
      : null,
    recommended: Boolean(row.recommended),
    available: Boolean(row.available),
    trackStock: Boolean(row.track_stock),
    soldOut: Boolean(row.track_stock) && Number(row.stock_quantity) === 0,
    stockQuantity:
      row.stock_quantity === null ? null : Number(row.stock_quantity),
    lowStockThreshold:
      row.low_stock_threshold === null ? null : Number(row.low_stock_threshold),
    modifierGroups: linkRows
      .filter((link) => String(link.menu_item_id) === String(row.id))
      .map((link) => {
        const group = groupRows.find(
          (entry) => String(entry.id) === String(link.modifier_group_id),
        );
        if (!group) return null;
        return {
          id: String(group.id),
          name: String(group.name),
          required: Boolean(group.required),
          minSelections: Number(group.min_selections),
          maxSelections: Number(group.max_selections),
          options: optionRows
            .filter((option) => String(option.group_id) === String(group.id))
            .map((option) => ({
              id: String(option.id),
              name: String(option.name),
              priceDeltaSatang: Number(option.price_delta_satang),
            })),
        };
      })
      .filter((group): group is ModifierGroup => group !== null),
  }));
  return { categories, items };
}

export async function getHistory(
  restaurantId: string,
): Promise<HistorySession[]> {
  if (!isSupabaseConfigured || restaurantId === "demo")
    return [
      {
        id: "history-1",
        tableName: "A03",
        openedAt: new Date(Date.now() - 4 * 60 * 60_000).toISOString(),
        closedAt: new Date(Date.now() - 2.5 * 60 * 60_000).toISOString(),
        guestCount: 4,
        paymentMethod: "CASH",
        orderCount: 3,
        orderNumbers: [1041, 1042, 1045],
        totalSatang: 286000,
      },
      {
        id: "history-2",
        tableName: "A01",
        openedAt: new Date(Date.now() - 7 * 60 * 60_000).toISOString(),
        closedAt: new Date(Date.now() - 6 * 60 * 60_000).toISOString(),
        guestCount: 2,
        paymentMethod: "TRANSFER",
        orderCount: 2,
        orderNumbers: [1038, 1039],
        totalSatang: 124000,
      },
    ];
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("table_sessions")
    .select(
      "id,opened_at,closed_at,guest_count,payment_method,restaurant_tables!inner(name),orders(id,order_number,status,order_items(quantity,unit_price_satang_snapshot,order_item_modifiers(price_delta_satang_snapshot)))",
    )
    .eq("restaurant_id", restaurantId)
    .eq("status", "CLOSED")
    .order("closed_at", { ascending: false })
    .limit(500);
  if (error || !Array.isArray(data)) return [];
  return data.map((row) => {
    const table = row.restaurant_tables as unknown as { name: string };
    const orders = row.orders as unknown as Array<{
      order_number: number;
      status: string;
      order_items: Array<{
        quantity: number;
        unit_price_satang_snapshot: number;
        order_item_modifiers: Array<{ price_delta_satang_snapshot: number }>;
      }>;
    }>;
    const validOrders = orders.filter((order) => order.status !== "CANCELLED");
    const total = validOrders.reduce(
      (sum, order) =>
        sum +
        order.order_items.reduce(
          (itemSum, item) =>
            itemSum +
            (item.unit_price_satang_snapshot +
              item.order_item_modifiers.reduce(
                (modifierSum, modifier) =>
                  modifierSum + modifier.price_delta_satang_snapshot,
                0,
              )) *
              item.quantity,
          0,
        ),
      0,
    );
    return {
      id: String(row.id),
      tableName: table.name,
      openedAt: String(row.opened_at),
      closedAt: String(row.closed_at),
      guestCount: row.guest_count === null ? null : Number(row.guest_count),
      paymentMethod: row.payment_method ? String(row.payment_method) : null,
      orderCount: validOrders.length,
      orderNumbers: validOrders.map((order) => Number(order.order_number)),
      totalSatang: total,
    };
  });
}

export async function getRestaurantConfiguration(
  restaurantId: string,
): Promise<RestaurantConfiguration> {
  if (!isSupabaseConfigured || restaurantId === "demo")
    return {
      restaurant: {
        name: "SAVOUR",
        contactNumber: "02-000-0000",
        address: "Bangkok, Thailand",
        timezone: "Asia/Bangkok",
      },
      settings: {
        allowNotes: true,
        enableStaffCall: true,
        enableBillRequest: true,
        enableStockTracking: true,
        showSoldOutItems: true,
        requirePaymentBeforeClose: true,
      },
      zones: [{ id: "a", name: "Main Dining", sortOrder: 0, tableCount: 8 }],
    };
  const supabase = await createSupabaseServerClient();
  const [{ data: restaurant }, { data: settings }, { data: zones }] =
    await Promise.all([
      supabase
        .from("restaurants")
        .select("name,contact_number,address,timezone")
        .eq("id", restaurantId)
        .single(),
      supabase
        .from("restaurant_settings")
        .select(
          "allow_notes,enable_staff_call,enable_bill_request,enable_stock_tracking,show_sold_out_items,require_payment_before_close",
        )
        .eq("restaurant_id", restaurantId)
        .single(),
      supabase
        .from("zones")
        .select("id,name,sort_order,restaurant_tables(count)")
        .eq("restaurant_id", restaurantId)
        .eq("active", true)
        .order("sort_order"),
    ]);
  return {
    restaurant: {
      name: String(restaurant?.name ?? ""),
      contactNumber: String(restaurant?.contact_number ?? ""),
      address: String(restaurant?.address ?? ""),
      timezone: String(restaurant?.timezone ?? "Asia/Bangkok"),
    },
    settings: {
      allowNotes: Boolean(settings?.allow_notes),
      enableStaffCall: Boolean(settings?.enable_staff_call),
      enableBillRequest: Boolean(settings?.enable_bill_request),
      enableStockTracking: Boolean(settings?.enable_stock_tracking),
      showSoldOutItems: Boolean(settings?.show_sold_out_items),
      requirePaymentBeforeClose: Boolean(
        settings?.require_payment_before_close,
      ),
    },
    zones: (zones ?? []).map((zone) => ({
      id: String(zone.id),
      name: String(zone.name),
      sortOrder: Number(zone.sort_order),
      tableCount: Number(
        (zone.restaurant_tables as unknown as Array<{ count: number }>)[0]
          ?.count ?? 0,
      ),
    })),
  };
}

export async function getStaffMembers(
  restaurantId: string,
): Promise<StaffMember[]> {
  if (!isSupabaseConfigured || restaurantId === "demo")
    return [
      {
        userId: "demo-owner",
        displayName: "Narin P.",
        role: "OWNER",
        active: true,
        createdAt: new Date().toISOString(),
      },
      {
        userId: "demo-kitchen",
        displayName: "Kitchen Tablet",
        role: "KITCHEN",
        active: true,
        createdAt: new Date().toISOString(),
      },
    ];
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("restaurant_members")
    .select("user_id,display_name,role,active,created_at")
    .eq("restaurant_id", restaurantId)
    .order("created_at");
  return (data ?? []).map((member) => ({
    userId: String(member.user_id),
    displayName: String(member.display_name),
    role: member.role as StaffRole,
    active: Boolean(member.active),
    createdAt: String(member.created_at),
  }));
}

export async function getSessionBill(
  sessionId: string,
): Promise<SessionBill | null> {
  if (
    !isSupabaseConfigured ||
    sessionId.startsWith("history-") ||
    sessionId.startsWith("s")
  )
    return {
      sessionId,
      tableName: sessionId === "history-2" ? "A01" : "A03",
      restaurantName: "SAVOUR",
      openedAt: new Date(Date.now() - 90 * 60_000).toISOString(),
      items: [
        {
          name: "เนื้อย่างวากิว",
          quantity: 2,
          unitPriceSatang: 45000,
          modifierTotalSatang: 0,
        },
        {
          name: "สลัดผักย่าง",
          quantity: 1,
          unitPriceSatang: 19000,
          modifierTotalSatang: 0,
        },
        {
          name: "Ruby Citrus",
          quantity: 2,
          unitPriceSatang: 15000,
          modifierTotalSatang: 0,
        },
      ],
      totalSatang: 139000,
    };
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("get_session_bill", {
    p_session_id: sessionId,
  });
  if (error || !data || typeof data !== "object") return null;
  const value = data as Record<string, unknown>;
  if (!Array.isArray(value.items)) return null;
  return {
    sessionId: String(value.session_id),
    tableName: String(value.table_name),
    restaurantName: String(value.restaurant_name),
    openedAt: String(value.opened_at),
    items: value.items.map((item) => {
      const row = item as Record<string, unknown>;
      return {
        name: String(row.name),
        quantity: Number(row.quantity),
        unitPriceSatang: Number(row.unit_price_satang),
        modifierTotalSatang: Number(row.modifier_total_satang),
      };
    }),
    totalSatang: Number(value.total_satang),
  };
}
