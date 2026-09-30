"use server";

import { redirect } from "next/navigation";
import { KCC_ADMIN_EMAIL } from "@/lib/auth-config";
import { createSupabaseServer, hasSupabaseConfig } from "@/lib/supabase/server";

export type LoginState = { error: string };

export async function login(_: LoginState, formData: FormData): Promise<LoginState> {
  if (!hasSupabaseConfig()) return { error: "Secure authentication is being configured. Add the Supabase environment variables to continue." };
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const password = String(formData.get("password") || "");
  const allowed = KCC_ADMIN_EMAIL;
  if (email !== allowed) return { error: "This account is not authorized for KCC Ground Admin." };
  const supabase = await createSupabaseServer();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: "The email or password is incorrect." };
  redirect("/dashboard");
}
