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

function optional(formData: FormData, key: string, max = 1000) {
  return String(formData.get(key) || "").trim().slice(0, max);
}

function nonNegative(formData: FormData, key: string) {
  const value = Number(formData.get(key));
  if (!Number.isFinite(value) || value < 0 || value > 100000000) throw new Error(`Invalid ${key.replaceAll("_", " ")}.`);
  return value;
}

function uuid(formData: FormData) {
  const id = required(formData, "id", 36);
  if (!/^[0-9a-f-]{36}$/i.test(id)) throw new Error("Invalid record ID.");
  return id;
}

function oneOf(formData: FormData, key: string, values: string[]) {
  const value = required(formData, key, 30);
  if (!values.includes(value)) throw new Error(`Invalid ${key.replaceAll("_", " ")}.`);
  return value;
}

function bookingPayload(formData: FormData) {
  const total = nonNegative(formData, "total_amount");
  const advance = nonNegative(formData, "advance_amount");
  const collected = nonNegative(formData, "collected_amount");
  const paymentStatus = oneOf(formData, "payment_status", ["Open", "Settled"]);
  if (collected > total) throw new Error("Amount collected cannot exceed the quoted amount.");
  const difference = Math.max(total - collected, 0);
  return {
    booking_date: required(formData, "booking_date", 10),
    slot: oneOf(formData, "slot", ["07:00", "10:30", "14:00"]),
    team_name: required(formData, "team_name"), captain_name: required(formData, "captain_name"),
    phone: optional(formData, "phone", 30), advance_amount: advance, collected_amount: collected,
    total_amount: total, balance_amount: paymentStatus === "Settled" ? 0 : difference,
    discount_amount: paymentStatus === "Settled" ? difference : 0, payment_status: paymentStatus,
    status: oneOf(formData, "status", ["Confirmed", "Pending", "Cancelled"]), notes: optional(formData, "notes"),
  };
}

function tournamentPayload(formData: FormData) {
  return {
    name: required(formData, "name"), start_date: required(formData, "start_date", 10), end_date: required(formData, "end_date", 10),
    start_time: required(formData, "start_time", 5), end_time: required(formData, "end_time", 5),
    format: optional(formData, "format", 100), organizer: optional(formData, "organizer", 180),
    contact_phone: optional(formData, "contact_phone", 30),
    status: oneOf(formData, "status", ["Upcoming", "In progress", "Completed", "Cancelled"]), notes: optional(formData, "notes"),
  };
}

export async function signOut() {
  const { supabase } = await authorized();
  await supabase.auth.signOut();
  redirect("/login");
}

export async function createBooking(formData: FormData) {
  const { supabase } = await authorized();
  const { error } = await supabase.from("bookings").insert(bookingPayload(formData));
  if (error) throw new Error(error.code === "23505" ? "That slot is already booked." : error.message);
  revalidatePath("/dashboard");
}

export async function updateBooking(formData: FormData) {
  const { supabase } = await authorized();
  const { error } = await supabase.from("bookings").update(bookingPayload(formData)).eq("id", uuid(formData));
  if (error) throw new Error(error.code === "23505" ? "That slot is already booked." : error.message);
  revalidatePath("/dashboard");
}

export async function deleteBooking(formData: FormData) {
  const { supabase } = await authorized();
  const { error } = await supabase.from("bookings").delete().eq("id", uuid(formData));
  if (error) throw new Error(error.message);
  revalidatePath("/dashboard");
}

function clientPayload(formData: FormData) {
  return {
    name: required(formData, "name"), team_name: required(formData, "team_name"),
    phone: optional(formData, "phone", 30), email: optional(formData, "email", 254),
    status: oneOf(formData, "status", ["Active", "Inactive"]), notes: optional(formData, "notes"),
  };
}

export async function createClient(formData: FormData) {
  const { supabase } = await authorized();
  const { error } = await supabase.from("clients").insert(clientPayload(formData));
  if (error) throw new Error(error.message);
  revalidatePath("/dashboard");
}

export async function updateClient(formData: FormData) {
  const { supabase } = await authorized();
  const { error } = await supabase.from("clients").update(clientPayload(formData)).eq("id", uuid(formData));
  if (error) throw new Error(error.message);
  revalidatePath("/dashboard");
}

export async function blockDate(formData: FormData) {
  const { supabase } = await authorized();
  const { error } = await supabase.from("blocked_dates").insert({
    blocked_date: required(formData, "blocked_date", 10),
    slot: oneOf(formData, "slot", ["07:00", "10:30", "14:00", "All day"]), reason: required(formData, "reason", 300),
  });
  if (error) throw new Error(error.message);
  revalidatePath("/dashboard");
}

export async function createTournament(formData: FormData) {
  const { supabase } = await authorized();
  const { error } = await supabase.from("tournaments").insert(tournamentPayload(formData));
  if (error) throw new Error(error.message);
  revalidatePath("/dashboard");
}

export async function updateTournament(formData: FormData) {
  const { supabase } = await authorized();
  const { error } = await supabase.from("tournaments").update(tournamentPayload(formData)).eq("id", uuid(formData));
  if (error) throw new Error(error.message);
  revalidatePath("/dashboard");
}

export async function deleteTournament(formData: FormData) {
  const { supabase } = await authorized();
  const { error } = await supabase.from("tournaments").delete().eq("id", uuid(formData));
  if (error) throw new Error(error.message);
  revalidatePath("/dashboard");
}
