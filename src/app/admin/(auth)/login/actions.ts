"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { isSupabaseConfigured } from "@/lib/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export interface LoginState {
  message: string;
}

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
});

export async function login(
  _: LoginState,
  formData: FormData,
): Promise<LoginState> {
  if (!isSupabaseConfigured) redirect("/admin/tables");
  const parsed = schema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success)
    return { message: "กรุณากรอกอีเมลและรหัสผ่านให้ถูกต้อง" };
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) return { message: "อีเมลหรือรหัสผ่านไม่ถูกต้อง" };
  redirect("/admin/tables");
}
