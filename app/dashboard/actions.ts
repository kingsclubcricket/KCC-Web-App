"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireKccAdmin } from "@/lib/supabase/server";

async function authorized() {
  const auth = await requireKccAdmin();
  if (!auth) redirect("/login");
  return auth;
}

function required(formData: FormData, key: string, max = 180) {
  const value = String(formData.get(key) || "").trim();
  if (!value || value.length > max) throw new Error(`Invalid ${key.replaceAll("_", " ")}.`);
  return value;
}

function nonNegative(formData: FormData, key: string) {
  const value = Number(formData.get(key));
  if (!Number.isFinite(value) || value < 0 || value > 100000000) throw new Error(`Invalid ${key.replaceAll("_", " ")}.`);
  return value;
}

export async function signOut() {
  const { supabase } = await authorized();
  await supabase.auth.signOut();
  redirect("/login");
}

export async function createBooking(formData: FormData) {
  const { supabase } = await authorized();
  const total = nonNegative(formData, "total_amount");
  const advance = nonNegative(formData, "advance_amount");
  if (advance > total) throw new Error("Advance cannot exceed the total amount.");
  const payload = {
    booking_date: required(formData, "booking_date", 10), slot: required(formData, "slot", 8),
    team_name: required(formData, "team_name"), captain_name: required(formData, "captain_name"),
    phone: String(formData.get("phone") || "").trim().slice(0, 30), advance_amount: advance,
    balance_amount: Math.max(total - advance, 0), total_amount: total,
    status: required(formData, "status", 12), notes: String(formData.get("notes") || "").trim().slice(0, 1000),
  };
  const { error } = await supabase.from("bookings").insert(payload);
  if (error) throw new Error(error.message);
  revalidatePath("/dashboard");
}

export async function deleteBooking(formData: FormData) {
  const { supabase } = await authorized();
  const id = required(formData, "id", 36);
  if (!/^[0-9a-f-]{36}$/i.test(id)) throw new Error("Invalid booking ID.");
  const { error } = await supabase.from("bookings").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/dashboard");
}

export async function createClient(formData: FormData) {
  const { supabase } = await authorized();
  const { error } = await supabase.from("clients").insert({
    name: required(formData, "name"), team_name: required(formData, "team_name"),
    phone: String(formData.get("phone") || "").trim().slice(0, 30), email: String(formData.get("email") || "").trim().slice(0, 254),
    status: "Active", notes: String(formData.get("notes") || "").trim().slice(0, 1000),
  });
  if (error) throw new Error(error.message);
  revalidatePath("/dashboard");
}

export async function blockDate(formData: FormData) {
  const { supabase } = await authorized();
  const { error } = await supabase.from("blocked_dates").insert({
    blocked_date: required(formData, "blocked_date", 10), slot: required(formData, "slot", 12), reason: required(formData, "reason", 300),
  });
  if (error) throw new Error(error.message);
  revalidatePath("/dashboard");
}
