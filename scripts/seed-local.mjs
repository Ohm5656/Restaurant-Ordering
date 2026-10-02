import { createHash, randomBytes } from "node:crypto";

import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";

config({ path: ".env.local" });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !anonKey || !serviceKey)
  throw new Error("Missing local Supabase environment variables");

const admin = createClient(url, serviceKey, {
  auth: { persistSession: false },
});
const email = "owner@savour.local";
const password = "Demo1234!";

const { data: usersData } = await admin.auth.admin.listUsers({
  page: 1,
  perPage: 100,
});
let owner = usersData.users.find((user) => user.email === email);
if (!owner) {
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { display_name: "Narin P." },
  });
  if (error || !data.user) throw error ?? new Error("Unable to create owner");
  owner = data.user;
}

let { data: membership } = await admin
  .from("restaurant_members")
  .select("restaurant_id")
  .eq("user_id", owner.id)
  .maybeSingle();
if (!membership) {
  const userClient = createClient(url, anonKey, {
    auth: { persistSession: false },
  });
  const { error: signInError } = await userClient.auth.signInWithPassword({
    email,
    password,
  });
  if (signInError) throw signInError;
  const { data, error } = await userClient.rpc("bootstrap_restaurant", {
    p_restaurant_name: "SAVOUR",
    p_slug: "savour",
    p_owner_name: "Narin P.",
  });
  if (error) throw error;
  membership = { restaurant_id: data };
}

const restaurantId = membership.restaurant_id;
const { data: existingTables } = await admin
  .from("restaurant_tables")
  .select("id")
  .eq("restaurant_id", restaurantId)
  .limit(1);
if (!existingTables?.length) {
  const { data: mainZone } = await admin
    .from("zones")
    .select("id")
    .eq("restaurant_id", restaurantId)
    .eq("name", "Main Dining")
    .single();
  const { data: zoneB, error: zoneError } = await admin
    .from("zones")
    .insert({
      restaurant_id: restaurantId,
      name: "Private Room",
      sort_order: 10,
    })
    .select("id")
    .single();
  if (zoneError) throw zoneError;

  const tables = Array.from({ length: 20 }, (_, index) => ({
    restaurant_id: restaurantId,
    zone_id: index < 14 ? mainZone.id : zoneB.id,
    name: `${index < 14 ? "A" : "B"}${String(index < 14 ? index + 1 : index - 13).padStart(2, "0")}`,
    capacity: index % 5 === 0 ? 6 : index % 3 === 0 ? 2 : 4,
    sort_order: index,
  }));
  const { data: tableRows, error: tableError } = await admin
    .from("restaurant_tables")
    .insert(tables)
    .select("id,name");
  if (tableError) throw tableError;

  const { data: categories } = await admin
    .from("categories")
    .select("id,name")
    .eq("restaurant_id", restaurantId);
  const categoryId = (name) =>
    categories.find((category) => category.name === name)?.id ??
    categories[0].id;
  const menu = [
    [
      "แซลมอนย่างซอสยูซุ",
      "แซลมอนย่างซอสยูซุหอมสดชื่น",
      32000,
      "ทะเล",
      true,
      8,
      "https://images.unsplash.com/photo-1548943487-a2e4e43b4853?auto=format&fit=crop&w=900&q=85",
    ],
    [
      "เนื้อย่างวากิว",
      "เนื้อวากิวย่างถ่าน",
      45000,
      "เนื้อ",
      true,
      12,
      "https://images.unsplash.com/photo-1515668236457-83c3b8764839?auto=format&fit=crop&w=900&q=85",
    ],
    [
      "หมูสไลซ์",
      "หมูสไลซ์คัดพิเศษ",
      12000,
      "หมู",
      true,
      25,
      "https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?auto=format&fit=crop&w=900&q=85",
    ],
    [
      "สลัดผักย่าง",
      "ผักตามฤดูกาลย่าง",
      19000,
      "ผัก",
      true,
      null,
      "https://images.unsplash.com/photo-1588791167871-c1dc0ff28edd?auto=format&fit=crop&w=900&q=85",
    ],
    [
      "ราเมนซีฟู้ด",
      "ราเมนซีฟู้ดน้ำซุปรสเข้มข้น",
      28000,
      "ทะเล",
      false,
      3,
      "https://images.unsplash.com/photo-1581691762074-a12a9799107e?auto=format&fit=crop&w=900&q=85",
    ],
    [
      "Ruby Citrus",
      "ซิตรัสและเบอร์รี่โทนิก",
      15000,
      "เครื่องดื่ม",
      false,
      18,
      "https://images.unsplash.com/photo-1665989099287-3948d871232c?auto=format&fit=crop&w=900&q=85",
    ],
    [
      "ช็อกโกแลตเบอร์รี่",
      "ดาร์กช็อกโกแลตและเบอร์รี่สด",
      18000,
      "ของหวาน",
      false,
      null,
      "https://images.unsplash.com/photo-1590741664176-7fbd7e2592a0?auto=format&fit=crop&w=900&q=85",
    ],
  ].map(
    (
      [name, description, price, category, recommended, stock, image],
      index,
    ) => ({
      restaurant_id: restaurantId,
      category_id: categoryId(category),
      name,
      description,
      price_satang: price,
      recommended,
      available: true,
      track_stock: stock !== null,
      stock_quantity: stock,
      low_stock_threshold: stock !== null ? 5 : null,
      image_path: image,
      sort_order: index,
    }),
  );
  const { data: menuRows, error: menuError } = await admin
    .from("menu_items")
    .insert(menu)
    .select("id,name,price_satang");
  if (menuError) throw menuError;

  const statuses = ["NEW", "PREPARING", "READY", "ACTIVE", "BILL"];
  for (let index = 0; index < statuses.length; index += 1) {
    const table = tableRows[index + 1];
    const token = randomBytes(32).toString("hex");
    const tokenHash = createHash("sha256").update(token).digest("hex");
    const { data: session, error: sessionError } = await admin
      .from("table_sessions")
      .insert({
        restaurant_id: restaurantId,
        table_id: table.id,
        token_hash: tokenHash,
        qr_token: token,
        guest_count: 2 + (index % 3),
        opened_at: new Date(
          Date.now() - (index + 1) * 11 * 60_000,
        ).toISOString(),
        opened_by: owner.id,
        ...(statuses[index] === "BILL"
          ? { bill_requested_at: new Date().toISOString() }
          : {}),
      })
      .select("id")
      .single();
    if (sessionError) throw sessionError;
    if (statuses[index] !== "ACTIVE" && statuses[index] !== "BILL") {
      const { data: order, error: orderError } = await admin
        .from("orders")
        .insert({
          restaurant_id: restaurantId,
          table_session_id: session.id,
          status: statuses[index],
        })
        .select("id")
        .single();
      if (orderError) throw orderError;
      const selectedMenu = menuRows.slice(index, index + 2);
      const { error: itemError } = await admin.from("order_items").insert(
        selectedMenu.map((item, itemIndex) => ({
          restaurant_id: restaurantId,
          order_id: order.id,
          menu_item_id: item.id,
          menu_name_snapshot: item.name,
          unit_price_satang_snapshot: item.price_satang,
          quantity: itemIndex + 1,
        })),
      );
      if (itemError) throw itemError;
    }
  }
}

const { data: wagyu } = await admin
  .from("menu_items")
  .select("id")
  .eq("restaurant_id", restaurantId)
  .eq("name", "เนื้อย่างวากิว")
  .maybeSingle();
if (wagyu) {
  const { data: existingModifierLink } = await admin
    .from("menu_item_modifier_groups")
    .select("modifier_group_id")
    .eq("menu_item_id", wagyu.id)
    .limit(1);
  if (!existingModifierLink?.length) {
    const { data: doneness, error: groupError } = await admin
      .from("modifier_groups")
      .insert({
        restaurant_id: restaurantId,
        name: "ระดับความสุก",
        required: true,
        min_selections: 1,
        max_selections: 1,
      })
      .select("id")
      .single();
    if (groupError) throw groupError;
    const { error: optionError } = await admin.from("modifiers").insert([
      {
        restaurant_id: restaurantId,
        group_id: doneness.id,
        name: "Medium rare",
        price_delta_satang: 0,
        sort_order: 0,
      },
      {
        restaurant_id: restaurantId,
        group_id: doneness.id,
        name: "Medium",
        price_delta_satang: 0,
        sort_order: 1,
      },
      {
        restaurant_id: restaurantId,
        group_id: doneness.id,
        name: "Well done",
        price_delta_satang: 0,
        sort_order: 2,
      },
    ]);
    if (optionError) throw optionError;
    const { error: linkError } = await admin
      .from("menu_item_modifier_groups")
      .insert({
        menu_item_id: wagyu.id,
        modifier_group_id: doneness.id,
        sort_order: 0,
      });
    if (linkError) throw linkError;
  }
}

console.log(`Local owner ready: ${email} / ${password}`);
