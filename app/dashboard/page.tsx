import { redirect } from "next/navigation";
import { hasSupabaseConfig, requireKccAdmin } from "@/lib/supabase/server";
import { DashboardClient } from "./dashboard-client";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  if (!hasSupabaseConfig()) redirect("/login");
  const auth = await requireKccAdmin();
  if (!auth) redirect("/login");
  const { supabase } = auth;
  const [bookings, clients, expenses, invoices, maintenance, blocked, collections, ledger, tournaments] = await Promise.all([
    supabase.from("bookings").select("*").order("booking_date", { ascending: false }).order("slot", { ascending: false }),
    supabase.from("clients").select("*").order("created_at", { ascending: false }),
    supabase.from("expenses").select("*").order("expense_date", { ascending: false }),
    supabase.from("invoices").select("*").order("issued_date", { ascending: false }),
    supabase.from("maintenance_tasks").select("*").order("created_at", { ascending: false }),
    supabase.from("blocked_dates").select("*").order("blocked_date", { ascending: true }),
    supabase.from("collections").select("*").order("collection_date", { ascending: false, nullsFirst: false }),
    supabase.from("ledger_entries").select("*").order("source_row", { ascending: true }),
    supabase.from("tournaments").select("*").order("start_date", { ascending: true }),
  ]);
  const failure = [bookings, clients, expenses, invoices, maintenance, blocked, collections, ledger, tournaments].find(result => result.error)?.error;
  if (failure) throw new Error(`Database setup is incomplete: ${failure.message}`);
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Chicago", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  return <DashboardClient today={today} data={{ bookings:bookings.data||[], clients:clients.data||[], expenses:expenses.data||[], invoices:invoices.data||[], maintenance:maintenance.data||[], blocked:blocked.data||[], collections:collections.data||[], ledger:ledger.data||[], tournaments:tournaments.data||[] }} />;
}
