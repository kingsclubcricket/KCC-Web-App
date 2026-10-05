"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireKccAdmin } from "@/lib/supabase/server";
import { buildInvoicePdf, type InvoiceDetails } from "@/lib/invoice-pdf";
import { emailShell, sendTransactionalEmail } from "@/lib/transactional-email";
import { createUpiUrl, KCC_PAYMENT_CONFIG } from "@/lib/kcc-config";
import QRCode from "qrcode";

const START = "2026-10-01";
async function authorized() { const auth = await requireKccAdmin(); if (!auth) redirect("/login"); return auth; }
function required(fd: FormData, key: string, max = 180) { const value = String(fd.get(key) || "").trim(); if (!value || value.length > max) throw new Error(`Invalid ${key.replaceAll("_", " ")}.`); return value; }
function optional(fd: FormData, key: string, max = 1000) { return String(fd.get(key) || "").trim().slice(0, max); }
function email(fd: FormData, key: string) { const value = optional(fd, key, 254).toLowerCase(); if (value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) throw new Error("Enter a valid client email."); return value; }
function nonNegative(fd: FormData, key: string) { const value = Number(fd.get(key)); if (!Number.isFinite(value) || value < 0 || value > 100000000) throw new Error(`Invalid ${key.replaceAll("_", " ")}.`); return value; }
function positive(fd: FormData, key: string) { const value = nonNegative(fd, key); if (value <= 0) throw new Error(`${key.replaceAll("_", " ")} must be greater than zero.`); return value; }
function uuid(fd: FormData, key = "id") { const id = required(fd, key, 36); if (!/^[0-9a-f-]{36}$/i.test(id)) throw new Error("Invalid record ID."); return id; }
function optionalUuid(fd: FormData, key: string) { const id = optional(fd, key, 36); if (id && !/^[0-9a-f-]{36}$/i.test(id)) throw new Error(`Invalid ${key.replaceAll("_", " ")}.`); return id || null; }
function oneOf(fd: FormData, key: string, values: string[]) { const value = required(fd, key, 30); if (!values.includes(value)) throw new Error(`Invalid ${key.replaceAll("_", " ")}.`); return value; }
async function origin() { if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, ""); const h = await headers(); const host = h.get("x-forwarded-host") || h.get("host") || "localhost:3000"; return `${h.get("x-forwarded-proto") || (host.includes("localhost") ? "http" : "https")}://${host}`; }
async function qrAttachment(amount: number, reference: string) { const png = await QRCode.toBuffer(createUpiUrl(amount, reference), { width: 360, margin: 2 }); return { filename: "kcc-upi-payment.png", content: png.toString("base64"), contentType: "image/png", contentId: "kcc-payment-qr" }; }

function bookingPayload(fd: FormData) {
  const total = nonNegative(fd, "total_amount");
  const advance = nonNegative(fd, "advance_amount");
  const collected = nonNegative(fd, "collected_amount");
  if (advance > total) throw new Error("Advance requested cannot exceed the total amount.");
  if (collected > total) throw new Error("Amount collected cannot exceed the total amount.");
  const bookingDate = required(fd, "booking_date", 10);
  if (bookingDate < START) throw new Error("Bookings must be dated 01 October 2026 or later.");
  const balance = Math.max(total - collected, 0);
  return { client_id: optionalUuid(fd, "client_id"), booking_date: bookingDate, slot: oneOf(fd, "slot", ["07:00", "10:30", "14:00"]), team_name: required(fd, "team_name"), captain_name: required(fd, "captain_name"), phone: optional(fd, "phone", 30), client_email: email(fd, "client_email"), advance_amount: advance, collected_amount: collected, total_amount: total, balance_amount: balance, discount_amount: 0, payment_status: balance === 0 ? "Settled" : "Open", status: oneOf(fd, "status", ["Confirmed", "Pending", "Cancelled"]), notes: optional(fd, "notes") };
}

async function logNotification(supabase: any, values: Record<string, unknown>) { const { error } = await supabase.from("notification_events").insert(values); if (error) throw new Error(`Notification history could not be saved: ${error.message}`); }

async function createBookingCommunication(supabase: any, booking: Record<string, any>) {
  if (!booking.client_email) return;
  let paymentUrl = "";
  if (Number(booking.advance_amount) > 0) {
    const { data: request, error } = await supabase.from("payment_requests").insert({ booking_id: booking.id, amount: booking.advance_amount }).select("public_token").single();
    if (error) throw new Error(`Payment request could not be created: ${error.message}`);
    paymentUrl = `${await origin()}/pay/${request.public_token}`;
  }
  const subject = `KCC booking confirmed · ${booking.booking_date} at ${String(booking.slot).slice(0, 5)}`;
  const reference = `KCC-${booking.id.slice(0, 8).toUpperCase()}`;
  const paymentBlock = paymentUrl ? `<p><b>Advance requested:</b> ₹${Number(booking.advance_amount).toLocaleString("en-IN")}</p><p style="text-align:center"><img src="cid:kcc-payment-qr" width="220" height="220" alt="KCC UPI payment QR"></p><p style="text-align:center"><b>UPI payment number: ${KCC_PAYMENT_CONFIG.paymentPhone}</b><br>Reference: ${reference}</p><p><a href="${paymentUrl}" style="display:inline-block;background:#bd1019;color:#fff;text-decoration:none;padding:13px 20px;border-radius:8px;font-weight:bold">View payment options</a></p>` : "";
  const attachments = paymentUrl ? [await qrAttachment(Number(booking.advance_amount), reference)] : undefined;
  const result = await sendTransactionalEmail({ to: booking.client_email, subject, idempotencyKey: `booking-confirmation-${booking.id}`, html: emailShell("Your KCC slot is booked", `<p>Hello ${booking.captain_name},</p><p>Your booking for <b>${booking.team_name}</b> is confirmed.</p><p><b>Date:</b> ${booking.booking_date}<br><b>Slot:</b> ${String(booking.slot).slice(0, 5)}<br><b>Total amount:</b> ₹${Number(booking.total_amount).toLocaleString("en-IN")}</p>${paymentBlock}`), attachments });
  await logNotification(supabase, { booking_id: booking.id, recipient: booking.client_email, notification_type: "Booking confirmation", subject, status: result.status, provider_id: result.providerId, error_message: result.error });
}

async function finalizeSettledBooking(supabase: any, booking: Record<string, any>, paidAt: string, reference: string) {
  await supabase.from("payment_requests").update({ status: "Paid" }).eq("booking_id", booking.id).eq("status", "Open");
  const invoiceNumber = `KCC-${booking.booking_date.replaceAll("-", "")}-${booking.id.slice(0, 6).toUpperCase()}`;
  const invoicePayload = { booking_id: booking.id, invoice_number: invoiceNumber, issued_date: new Date().toISOString().slice(0, 10), client_name: booking.captain_name, client_email: booking.client_email, amount: booking.total_amount, status: "Paid", paid_at: paidAt, notes: `Payment receipt for ${booking.team_name}` };
  const { data: existingInvoice, error: lookupError } = await supabase.from("invoices").select("id").eq("booking_id", booking.id).maybeSingle();
  if (lookupError) throw new Error(`Invoice could not be checked: ${lookupError.message}`);
  const invoiceResult = existingInvoice
    ? await supabase.from("invoices").update(invoicePayload).eq("id", existingInvoice.id).select("*").single()
    : await supabase.from("invoices").insert(invoicePayload).select("*").single();
  const { data: invoice, error: invoiceError } = invoiceResult;
  if (invoiceError) throw new Error(`Invoice could not be created: ${invoiceError.message}`);
  if (!booking.client_email) return;

  const url = `${await origin()}/api/invoices/${invoice.public_token}`;
  const details: InvoiceDetails = { ...invoice, amount: Number(invoice.amount), booking_date: booking.booking_date, slot: booking.slot, team_name: booking.team_name, captain_name: booking.captain_name, payment_reference: reference };
  const pdf = await buildInvoicePdf(details); const subject = `KCC payment receipt · ${invoice.invoice_number}`;
  const result = await sendTransactionalEmail({ to: booking.client_email, subject, idempotencyKey: `invoice-${invoice.id}`, html: emailShell("Payment received in full", `<p>Hello ${booking.captain_name},</p><p>We received the full payment of <b>₹${Number(booking.total_amount).toLocaleString("en-IN")}</b> for your KCC booking.</p><p><a href="${url}" style="display:inline-block;background:#bd1019;color:#fff;text-decoration:none;padding:13px 20px;border-radius:8px;font-weight:bold">Download receipt</a></p>`), attachments: [{ filename: `${invoice.invoice_number}.pdf`, content: Buffer.from(pdf).toString("base64") }] });
  await supabase.from("invoices").update({ emailed_at: result.status === "Sent" ? new Date().toISOString() : null }).eq("id", invoice.id);
  await logNotification(supabase, { booking_id: booking.id, invoice_id: invoice.id, recipient: booking.client_email, notification_type: "Invoice", subject, status: result.status, provider_id: result.providerId, error_message: result.error });
}

export async function signOut() { const { supabase } = await authorized(); await supabase.auth.signOut(); redirect("/login"); }
export async function createBooking(fd: FormData) {
  const { supabase } = await authorized();
  const shouldSend = optional(fd, "communication_action", 20) === "send";
  const payload = bookingPayload(fd);
  if (shouldSend && !payload.client_email) throw new Error("Add a client email or choose Save booking only.");
  const { data, error } = await supabase.from("bookings").insert(payload).select("*").single();
  if (error) throw new Error(error.code === "23505" ? "That slot is already booked." : error.message);
  if (shouldSend) await createBookingCommunication(supabase, data);
  revalidatePath("/dashboard");
}
export async function updateBooking(fd: FormData) { const { supabase } = await authorized(); const { error } = await supabase.from("bookings").update(bookingPayload(fd)).eq("id", uuid(fd)); if (error) throw new Error(error.code === "23505" ? "That slot is already booked." : error.message); revalidatePath("/dashboard"); }
export async function deleteBooking(fd: FormData) { const { supabase } = await authorized(); const { error } = await supabase.from("bookings").delete().eq("id", uuid(fd)); if (error) throw new Error(error.message); revalidatePath("/dashboard"); }

export async function sendPaymentRequest(fd: FormData) {
  const { supabase } = await authorized(); const bookingId = uuid(fd, "booking_id"); const amount = positive(fd, "amount");
  const { data: booking, error: bookingError } = await supabase.from("bookings").select("*").eq("id", bookingId).single();
  if (bookingError || !booking) throw new Error("Booking could not be found.");
  if (amount > Number(booking.balance_amount)) throw new Error("Payment request cannot exceed the remaining balance.");
  const { data: request, error } = await supabase.from("payment_requests").insert({ booking_id: bookingId, amount }).select("public_token").single(); if (error) throw new Error(error.message);
  if (!booking.client_email) { revalidatePath("/dashboard"); return; }
  const url = `${await origin()}/pay/${request.public_token}`; const subject = `KCC payment request · ${booking.booking_date}`; const reference = `KCC-${booking.id.slice(0, 8).toUpperCase()}`;
  const result = await sendTransactionalEmail({ to: booking.client_email, subject, idempotencyKey: `payment-request-${request.public_token}`, html: emailShell("Complete your KCC payment", `<p>Hello ${booking.captain_name},</p><p>A payment of <b>₹${amount.toLocaleString("en-IN")}</b> is requested for your ${booking.booking_date} booking.</p><p style="text-align:center"><img src="cid:kcc-payment-qr" width="220" height="220" alt="KCC UPI payment QR"></p><p style="text-align:center"><b>UPI payment number: ${KCC_PAYMENT_CONFIG.paymentPhone}</b><br>Reference: ${reference}</p><p><a href="${url}" style="display:inline-block;background:#bd1019;color:#fff;text-decoration:none;padding:13px 20px;border-radius:8px;font-weight:bold">Open secure payment page</a></p>`), attachments: [await qrAttachment(amount, reference)] });
  await logNotification(supabase, { booking_id: bookingId, recipient: booking.client_email, notification_type: "Payment request", subject, status: result.status, provider_id: result.providerId, error_message: result.error }); revalidatePath("/dashboard");
}

export async function recordPayment(fd: FormData) {
  const { supabase } = await authorized(); const bookingId = uuid(fd, "booking_id"); const amount = positive(fd, "amount");
  const { data: booking, error: bookingError } = await supabase.from("bookings").select("*").eq("id", bookingId).single();
  if (bookingError || !booking) throw new Error("Booking could not be found.");
  if (amount > Number(booking.balance_amount)) throw new Error("Payment cannot exceed the remaining booking balance.");
  const paidInput = optional(fd, "paid_at", 16); const paidAt = paidInput ? new Date(paidInput).toISOString() : new Date().toISOString(); const reference = optional(fd, "reference", 180);
  const { error: paymentError } = await supabase.from("payments").insert({ booking_id: bookingId, amount, payment_type: oneOf(fd, "payment_type", ["Advance", "Balance", "Full", "Adjustment"]), method: oneOf(fd, "method", ["UPI", "Cash", "Bank transfer", "Payment link", "Other"]), status: "Paid", reference, notes: optional(fd, "notes"), paid_at: paidAt });
  if (paymentError) throw new Error(paymentError.message);
  const collected = Number(booking.collected_amount) + amount; const balance = Math.max(Number(booking.total_amount) - collected, 0); const settled = balance === 0;
  const { error: updateError } = await supabase.from("bookings").update({ collected_amount: collected, balance_amount: balance, payment_status: settled ? "Settled" : "Open" }).eq("id", bookingId); if (updateError) throw new Error(updateError.message);
  if (settled) await finalizeSettledBooking(supabase, booking, paidAt, reference);
  revalidatePath("/dashboard");
}

export async function updatePayment(fd: FormData) {
  const { supabase } = await authorized();
  const paymentId = uuid(fd);
  const amount = positive(fd, "amount");
  const { data: payment, error: paymentLookupError } = await supabase.from("payments").select("*").eq("id", paymentId).single();
  if (paymentLookupError || !payment) throw new Error("Payment could not be found.");
  const { data: booking, error: bookingError } = await supabase.from("bookings").select("*").eq("id", payment.booking_id).single();
  if (bookingError || !booking) throw new Error("The payment's booking could not be found.");

  const previousAmount = Number(payment.amount);
  const maximumAmount = Number(booking.balance_amount) + previousAmount;
  if (amount > maximumAmount) throw new Error("Payment cannot exceed the booking's total amount.");

  const paidInput = optional(fd, "paid_at", 16);
  const paidAt = paidInput ? new Date(paidInput).toISOString() : payment.paid_at || payment.created_at;
  const values = {
    amount,
    payment_type: oneOf(fd, "payment_type", ["Advance", "Balance", "Full", "Adjustment"]),
    method: oneOf(fd, "method", ["UPI", "Cash", "Bank transfer", "Payment link", "Other"]),
    reference: optional(fd, "reference", 180),
    notes: optional(fd, "notes"),
    paid_at: paidAt,
  };
  const { error: paymentError } = await supabase.from("payments").update(values).eq("id", paymentId);
  if (paymentError) throw new Error(paymentError.message);

  const collected = Math.max(Number(booking.collected_amount) - previousAmount + amount, 0);
  const balance = Math.max(Number(booking.total_amount) - collected, 0);
  const settled = balance === 0;
  const { error: updateError } = await supabase.from("bookings").update({
    collected_amount: collected,
    balance_amount: balance,
    payment_status: settled ? "Settled" : "Open",
  }).eq("id", booking.id);
  if (updateError) {
    await supabase.from("payments").update({
      amount: payment.amount,
      payment_type: payment.payment_type,
      method: payment.method,
      reference: payment.reference,
      notes: payment.notes,
      paid_at: payment.paid_at,
    }).eq("id", paymentId);
    throw new Error(updateError.message);
  }

  if (!settled) {
    await supabase.from("invoices").update({ status: "Due", paid_at: null }).eq("booking_id", booking.id);
  } else if (Number(booking.balance_amount) > 0) {
    await finalizeSettledBooking(supabase, booking, paidAt, values.reference);
  }
  revalidatePath("/dashboard");
}

export async function deletePayment(fd: FormData) {
  const { supabase } = await authorized();
  const { error } = await supabase.rpc("delete_kcc_payment", { target_payment_id: uuid(fd) });
  if (error) throw new Error(error.message);
  revalidatePath("/dashboard");
}

function clientPayload(fd: FormData) { return { name: required(fd, "name"), team_name: required(fd, "team_name"), phone: optional(fd, "phone", 30), email: email(fd, "email"), status: oneOf(fd, "status", ["Active", "Inactive"]), notes: optional(fd, "notes") }; }
export async function createClient(fd: FormData) { const { supabase } = await authorized(); const { error } = await supabase.from("clients").insert(clientPayload(fd)); if (error) throw new Error(error.message); revalidatePath("/dashboard"); }
export async function updateClient(fd: FormData) { const { supabase } = await authorized(); const { error } = await supabase.from("clients").update(clientPayload(fd)).eq("id", uuid(fd)); if (error) throw new Error(error.message); revalidatePath("/dashboard"); }
function expensePayload(fd: FormData) {
  const expenseDate = required(fd, "expense_date", 10);
  if (expenseDate < START) throw new Error("Expenses must be dated 01 October 2026 or later.");
  return { expense_date: expenseDate, item: required(fd, "item"), category: required(fd, "category", 100), amount: positive(fd, "amount"), status: oneOf(fd, "status", ["Paid", "Pending"]), notes: optional(fd, "notes") };
}
export async function createExpense(fd: FormData) { const { supabase } = await authorized(); const { error } = await supabase.from("expenses").insert(expensePayload(fd)); if (error) throw new Error(error.message); revalidatePath("/dashboard"); }
export async function updateExpense(fd: FormData) { const { supabase } = await authorized(); const { error } = await supabase.from("expenses").update(expensePayload(fd)).eq("id", uuid(fd)); if (error) throw new Error(error.message); revalidatePath("/dashboard"); }
export async function deleteExpense(fd: FormData) { const { supabase } = await authorized(); const { error } = await supabase.from("expenses").delete().eq("id", uuid(fd)); if (error) throw new Error(error.message); revalidatePath("/dashboard"); }
export async function blockDate(fd: FormData) { const { supabase } = await authorized(); const blockedDate = required(fd, "blocked_date", 10); if (blockedDate < START) throw new Error("Blocked dates must be 01 October 2026 or later."); const { error } = await supabase.from("blocked_dates").insert({ blocked_date: blockedDate, slot: oneOf(fd, "slot", ["07:00", "10:30", "14:00", "All day"]), reason: required(fd, "reason", 300) }); if (error) throw new Error(error.message); revalidatePath("/dashboard"); }
function tournamentPayload(fd: FormData) { return { name: required(fd, "name"), start_date: required(fd, "start_date", 10), end_date: required(fd, "end_date", 10), start_time: required(fd, "start_time", 5), end_time: required(fd, "end_time", 5), format: optional(fd, "format", 100), organizer: optional(fd, "organizer", 180), contact_phone: optional(fd, "contact_phone", 30), status: oneOf(fd, "status", ["Upcoming", "In progress", "Completed", "Cancelled"]), notes: optional(fd, "notes") }; }
export async function createTournament(fd: FormData) { const { supabase } = await authorized(); const { error } = await supabase.from("tournaments").insert(tournamentPayload(fd)); if (error) throw new Error(error.message); revalidatePath("/dashboard"); }
export async function updateTournament(fd: FormData) { const { supabase } = await authorized(); const { error } = await supabase.from("tournaments").update(tournamentPayload(fd)).eq("id", uuid(fd)); if (error) throw new Error(error.message); revalidatePath("/dashboard"); }
export async function deleteTournament(fd: FormData) { const { supabase } = await authorized(); const { error } = await supabase.from("tournaments").delete().eq("id", uuid(fd)); if (error) throw new Error(error.message); revalidatePath("/dashboard"); }
function maintenancePayload(fd: FormData) { const due = optional(fd, "due_date", 10); return { title: required(fd, "title"), description: optional(fd, "description"), category: required(fd, "category", 100), priority: oneOf(fd, "priority", ["Routine", "Urgent"]), status: oneOf(fd, "status", ["To do", "In progress", "Completed"]), due_date: due || null }; }
export async function createMaintenanceTask(fd: FormData) { const { supabase } = await authorized(); const { error } = await supabase.from("maintenance_tasks").insert(maintenancePayload(fd)); if (error) throw new Error(error.message); revalidatePath("/dashboard"); }
export async function updateMaintenanceTask(fd: FormData) { const { supabase } = await authorized(); const { error } = await supabase.from("maintenance_tasks").update(maintenancePayload(fd)).eq("id", uuid(fd)); if (error) throw new Error(error.message); revalidatePath("/dashboard"); }
