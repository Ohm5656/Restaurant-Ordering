"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { createSupabaseServerClient } from "@/lib/supabase/server";

export interface SetupState {
  message: string;
}

const schema = z.object({
  restaurantName: z.string().trim().min(1).max(120),
  slug: z
    .string()
    .trim()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  ownerName: z.string().trim().min(1).max(100),
});

export async function setupRestaurant(
  _: SetupState,
  formData: FormData,
): Promise<SetupState> {
  const parsed = schema.safeParse({
    restaurantName: formData.get("restaurantName"),
    slug: formData.get("slug"),
    ownerName: formData.get("ownerName"),
  });
  if (!parsed.success)
    return { message: "กรุณาตรวจสอบชื่อร้าน ชื่อผู้ดูแล และ slug ภาษาอังกฤษ" };
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("bootstrap_restaurant", {
    p_restaurant_name: parsed.data.restaurantName,
    p_slug: parsed.data.slug,
    p_owner_name: parsed.data.ownerName,
  });
  if (error)
    return { message: "ตั้งค่าร้านไม่สำเร็จ โปรเจกต์นี้อาจถูกตั้งค่าแล้ว" };
  redirect("/admin/tables");
}
