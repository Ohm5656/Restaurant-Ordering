import { NextResponse } from "next/server";
import { z } from "zod";

import { getAdminContext } from "@/lib/data/admin";
import { isSupabaseConfigured } from "@/lib/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const fieldsSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(1).max(120),
  description: z.string().trim().max(1000),
  categoryId: z.string().min(1),
  priceBaht: z.coerce.number().min(0).max(10_000_000),
  stockQuantity: z.coerce.number().int().min(0),
  lowStockThreshold: z.coerce.number().int().min(0),
});

const modifierGroupsSchema = z.array(
  z
    .object({
      name: z.string().trim().min(1).max(100),
      required: z.boolean(),
      minSelections: z.number().int().min(0),
      maxSelections: z.number().int().min(1),
      options: z
        .array(
          z.object({
            name: z.string().trim().min(1).max(100),
            priceDeltaSatang: z.number().int().min(-10_000_000).max(10_000_000),
          }),
        )
        .min(1),
    })
    .refine(
      (group) =>
        group.minSelections <= group.maxSelections &&
        group.maxSelections <= group.options.length,
    ),
);

export async function POST(request: Request) {
  const context = await getAdminContext();
  if (!context || !["OWNER", "ADMIN"].includes(context.role))
    return NextResponse.json(
      { message: "คุณไม่มีสิทธิ์จัดการเมนู" },
      { status: 403 },
    );
  const formData = await request.formData();
  const parsed = fieldsSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success)
    return NextResponse.json(
      { message: "กรุณาตรวจสอบข้อมูลเมนูและราคา" },
      {
        status: 400,
      },
    );
  let modifierPayload: unknown;
  try {
    modifierPayload = JSON.parse(
      String(formData.get("modifierGroups") ?? "[]"),
    );
  } catch {
    modifierPayload = null;
  }
  const modifierGroups = modifierGroupsSchema.safeParse(modifierPayload);
  if (!modifierGroups.success)
    return NextResponse.json(
      { message: "กรุณาตรวจสอบกลุ่มตัวเลือกและจำนวนที่เลือกได้" },
      { status: 400 },
    );
  if (!isSupabaseConfigured || context.restaurantId === "demo")
    return NextResponse.json({ id: parsed.data.id ?? crypto.randomUUID() });
  const supabase = await createSupabaseServerClient();
  const { data: category } = await supabase
    .from("categories")
    .select("id")
    .eq("id", parsed.data.categoryId)
    .eq("restaurant_id", context.restaurantId)
    .single();
  if (!category)
    return NextResponse.json(
      { message: "ไม่พบหมวดหมู่ที่เลือก" },
      { status: 400 },
    );

  let imagePath: string | undefined;
  const image = formData.get("image");
  if (image instanceof File && image.size > 0) {
    if (
      image.size > 5 * 1024 * 1024 ||
      !["image/jpeg", "image/png", "image/webp", "image/avif"].includes(
        image.type,
      )
    )
      return NextResponse.json(
        { message: "รูปต้องเป็น JPG, PNG, WebP หรือ AVIF และไม่เกิน 5 MB" },
        { status: 400 },
      );
    const extension =
      image.name
        .split(".")
        .pop()
        ?.toLowerCase()
        .replace(/[^a-z0-9]/g, "") || "jpg";
    imagePath = `${context.restaurantId}/menu/${crypto.randomUUID()}.${extension}`;
    const { error: uploadError } = await supabase.storage
      .from("restaurant-assets")
      .upload(imagePath, image, { contentType: image.type, upsert: false });
    if (uploadError)
      return NextResponse.json(
        { message: "อัปโหลดรูปไม่สำเร็จ" },
        { status: 409 },
      );
  }

  const trackStock = formData.get("trackStock") === "on";
  const values = {
    restaurant_id: context.restaurantId,
    category_id: parsed.data.categoryId,
    name: parsed.data.name,
    description: parsed.data.description,
    price_satang: Math.round(parsed.data.priceBaht * 100),
    recommended: formData.get("recommended") === "on",
    available: formData.get("available") === "on",
    track_stock: trackStock,
    stock_quantity: trackStock ? parsed.data.stockQuantity : null,
    low_stock_threshold: trackStock ? parsed.data.lowStockThreshold : null,
    ...(imagePath ? { image_path: imagePath } : {}),
  };
  const query = parsed.data.id
    ? supabase
        .from("menu_items")
        .update(values)
        .eq("id", parsed.data.id)
        .eq("restaurant_id", context.restaurantId)
    : supabase.from("menu_items").insert(values);
  const { data, error } = await query.select("id").single();
  if (error)
    return NextResponse.json(
      { message: "บันทึกเมนูไม่สำเร็จ" },
      { status: 409 },
    );
  const { error: modifierError } = await supabase.rpc(
    "set_menu_item_modifiers",
    {
      p_menu_item_id: data.id,
      p_groups: modifierGroups.data,
    },
  );
  if (modifierError)
    return NextResponse.json(
      { message: "บันทึกเมนูแล้ว แต่บันทึกตัวเลือกไม่สำเร็จ กรุณาลองอีกครั้ง" },
      { status: 409 },
    );
  return NextResponse.json({ id: data.id });
}
