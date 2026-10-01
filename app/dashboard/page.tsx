import { redirect } from "next/navigation";
import { hasSupabaseConfig, requireKccAdmin } from "@/lib/supabase/server";
import { DashboardClient } from "./dashboard-client";

export const dynamic = "force-dynamic";
const OPERATION_START_DATE = "2026-10-01";

export default async function DashboardPage() {
  if (!hasSupabaseConfig()) redirect("/login");
  const auth = await requireKccAdmin();
  if (!auth) redirect("/login");
  const { supabase } = auth;
  const [bookings, clients, expenses, maintenance, blocked, collections, ledger, tournaments, payments, paymentRequests, invoices, notifications] = await Promise.all([
    supabase.from("bookings").select("*").gte("booking_date", OPERATION_START_DATE).order("booking_date", { ascending: false }).order("slot", { ascending: false }),
    supabase.from("clients").select("*").order("created_at", { ascending: false }),
    supabase.from("expenses").select("*").gte("expense_date", OPERATION_START_DATE).order("expense_date", { ascending: false }),
    supabase.from("maintenance_tasks").select("*").gte("created_at", `${OPERATION_START_DATE}T00:00:00Z`).order("created_at", { ascending: false }),
    supabase.from("blocked_dates").select("*").gte("blocked_date", OPERATION_START_DATE).order("blocked_date", { ascending: true }),
    supabase.from("collections").select("*").gte("collection_date", OPERATION_START_DATE).order("collection_date", { ascending: false }),
    supabase.from("ledger_entries").select("*").gte("entry_date", OPERATION_START_DATE).order("entry_date", { ascending: false }),
    supabase.from("tournaments").select("*").gte("end_date", OPERATION_START_DATE).order("start_date", { ascending: true }),
    supabase.from("payments").select("*").order("paid_at", { ascending: false }),
    supabase.from("payment_requests").select("*").order("created_at", { ascending: false }),
    supabase.from("invoices").select("*").not("booking_id", "is", null).order("created_at", { ascending: false }),
    supabase.from("notification_events").select("*").order("created_at", { ascending: false }).limit(50),
  ]);
  const failure = [bookings, clients, expenses, maintenance, blocked, collections, ledger, tournaments, payments, paymentRequests, invoices, notifications].find(result => result.error)?.error;
  if (failure) throw new Error(`Database setup is incomplete: ${failure.message}`);
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Chicago", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  return <DashboardClient today={today} data={{ bookings:bookings.data||[], clients:clients.data||[], expenses:expenses.data||[], maintenance:maintenance.data||[], blocked:blocked.data||[], collections:collections.data||[], ledger:ledger.data||[], tournaments:tournaments.data||[], payments:payments.data||[], paymentRequests:paymentRequests.data||[], invoices:invoices.data||[], notifications:notifications.data||[] }} />;
}
