import "server-only";

import { z } from "zod";

import { demoMenu } from "@/lib/demo-data";
import { isSupabaseConfigured, supabaseUrl } from "@/lib/env";
import { createSupabaseAnonClient } from "@/lib/supabase/anon";
import type { CustomerMenuData, CustomerOrder } from "@/lib/types";

const menuRpcSchema = z.object({
  restaurant: z.object({
    id: z.string().uuid(),
    name: z.string(),
    logo_url: z.string().nullable(),
  }),
  session: z.object({
    id: z.string().uuid(),
    table_name: z.string(),
    status: z.enum(["OPEN", "CLOSED"]),
    bill_requested: z.boolean(),
  }),
  settings: z.object({
    allow_notes: z.boolean(),
    enable_staff_call: z.boolean(),
    enable_bill_request: z.boolean(),
  }),
  categories: z.array(
    z.object({
      id: z.string().uuid(),
      name: z.string(),
      sort_order: z.number(),
    }),
  ),
  items: z.array(
    z.object({
      id: z.string().uuid(),
      category_id: z.string().uuid(),
      name: z.string(),
      description: z.string(),
      price_satang: z.number(),
      image_path: z.string().nullable(),
      recommended: z.boolean(),
      available: z.boolean(),
      sold_out: z.boolean(),
      modifier_groups: z.array(
        z.object({
          id: z.string().uuid(),
          name: z.string(),
          required: z.boolean(),
          min_selections: z.number(),
          max_selections: z.number(),
          options: z.array(
            z.object({
              id: z.string().uuid(),
              name: z.string(),
              price_delta_satang: z.number(),
            }),
          ),
        }),
      ),
    }),
  ),
});

const ordersRpcSchema = z.object({
  session_status: z.enum(["OPEN", "CLOSED"]),
  orders: z.array(
    z.object({
      id: z.string().uuid(),
      number: z.coerce.number(),
      status: z.enum([
        "NEW",
        "ACCEPTED",
        "PREPARING",
        "READY",
        "SERVED",
        "CANCELLED",
      ]),
      created_at: z.string(),
      items: z.array(
        z.object({
          name: z.string(),
          quantity: z.number(),
          note: z.string().nullable(),
          unit_price_satang: z.number(),
          modifiers: z.array(
            z.object({ name: z.string(), price_delta_satang: z.number() }),
          ),
        }),
      ),
    }),
  ),
});

function publicAssetUrl(path: string | null) {
  if (!path) return null;
  if (path.startsWith("https://")) return path;
  return `${supabaseUrl}/storage/v1/object/public/restaurant-assets/${path}`;
}

export async function getCustomerMenu(
  token: string,
): Promise<CustomerMenuData | null> {
  if (!isSupabaseConfigured || token === "demo") return demoMenu;

  const supabase = createSupabaseAnonClient();
  const { data, error } = await supabase.rpc("get_customer_menu", {
    p_token: token,
  });
  if (error || !data) return null;

  const parsed = menuRpcSchema.safeParse(data);
  if (!parsed.success) return null;
  const value = parsed.data;

  return {
    restaurant: {
      id: value.restaurant.id,
      name: value.restaurant.name,
      logoUrl: publicAssetUrl(value.restaurant.logo_url),
    },
    session: {
      id: value.session.id,
      tableName: value.session.table_name,
      status: value.session.status,
      billRequested: value.session.bill_requested,
    },
    settings: {
      allowNotes: value.settings.allow_notes,
      enableStaffCall: value.settings.enable_staff_call,
      enableBillRequest: value.settings.enable_bill_request,
    },
    categories: value.categories.map((category) => ({
      id: category.id,
      name: category.name,
      sortOrder: category.sort_order,
    })),
    items: value.items.map((item) => ({
      id: item.id,
      categoryId: item.category_id,
      name: item.name,
      description: item.description,
      priceSatang: item.price_satang,
      imageUrl: publicAssetUrl(item.image_path),
      recommended: item.recommended,
      available: item.available,
      trackStock: false,
      soldOut: item.sold_out,
      stockQuantity: null,
      lowStockThreshold: null,
      modifierGroups: item.modifier_groups.map((group) => ({
        id: group.id,
        name: group.name,
        required: group.required,
        minSelections: group.min_selections,
        maxSelections: group.max_selections,
        options: group.options.map((option) => ({
          id: option.id,
          name: option.name,
          priceDeltaSatang: option.price_delta_satang,
        })),
      })),
    })),
  };
}

export async function getCustomerOrders(
  token: string,
): Promise<CustomerOrder[]> {
  if (!isSupabaseConfigured || token === "demo") return [];
  const supabase = createSupabaseAnonClient();
  const { data, error } = await supabase.rpc("get_customer_orders", {
    p_token: token,
  });
  if (error || !data) return [];
  const parsed = ordersRpcSchema.safeParse(data);
  if (!parsed.success) return [];
  return parsed.data.orders.map((order) => ({
    id: order.id,
    number: order.number,
    status: order.status,
    createdAt: order.created_at,
    items: order.items.map((item) => ({
      name: item.name,
      quantity: item.quantity,
      note: item.note,
      unitPriceSatang: item.unit_price_satang,
      modifiers: item.modifiers.map((modifier) => ({
        name: modifier.name,
        priceDeltaSatang: modifier.price_delta_satang,
      })),
    })),
  }));
}
