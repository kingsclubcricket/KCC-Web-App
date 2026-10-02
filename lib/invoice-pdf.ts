import "server-only";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { KCC_PAYMENT_CONFIG } from "@/lib/kcc-config";

export type InvoiceDetails = {
  invoice_number: string;
  issued_date: string;
  client_name: string;
  client_email: string;
  amount: number;
  status: string;
  booking_date: string;
  slot: string;
  team_name: string;
  captain_name: string;
  payment_reference: string;
};

function clean(value: unknown) {
  return String(value ?? "").replace(/[^\x20-\x7E]/g, "");
}

export async function buildInvoicePdf(invoice: InvoiceDetails) {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([595.28, 841.89]);
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const ink = rgb(0.08, 0.07, 0.06);
  const red = rgb(0.72, 0.04, 0.08);
  const muted = rgb(0.39, 0.36, 0.33);
  const line = rgb(0.9, 0.87, 0.83);
  const money = `INR ${new Intl.NumberFormat("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(invoice.amount))}`;

  page.drawRectangle({ x: 0, y: 780, width: 595.28, height: 62, color: ink });
  page.drawText("KCC GROUND", { x: 42, y: 807, size: 19, font: bold, color: rgb(1, 1, 1) });
  page.drawText("PAYMENT RECEIPT", { x: 397, y: 808, size: 11, font: bold, color: rgb(1, 0.78, 0.18) });
  page.drawText(clean(invoice.invoice_number), { x: 397, y: 792, size: 9, font: regular, color: rgb(0.92, 0.92, 0.92) });

  page.drawText("Payment received", { x: 42, y: 725, size: 26, font: bold, color: ink });
  page.drawText("Thank you for booking with KCC Ground.", { x: 42, y: 701, size: 11, font: regular, color: muted });
  page.drawText(money, { x: 42, y: 644, size: 30, font: bold, color: red });
  page.drawText("PAID IN FULL", { x: 415, y: 651, size: 10, font: bold, color: red });
  page.drawLine({ start: { x: 42, y: 620 }, end: { x: 553, y: 620 }, thickness: 1, color: line });

  const rows: Array<[string, string]> = [
    ["Client", clean(invoice.client_name)],
    ["Email", clean(invoice.client_email || "Not provided")],
    ["Team", clean(invoice.team_name)],
    ["Captain", clean(invoice.captain_name)],
    ["Booking date", clean(invoice.booking_date)],
    ["Slot", clean(String(invoice.slot).slice(0, 5))],
    ["Issued", clean(invoice.issued_date)],
    ["Payment reference", clean(invoice.payment_reference || "Recorded by KCC admin")],
  ];
  let y = 581;
  for (const [label, value] of rows) {
    page.drawText(label.toUpperCase(), { x: 42, y, size: 8, font: bold, color: muted });
    page.drawText(value, { x: 210, y: y - 1, size: 11, font: regular, color: ink });
    page.drawLine({ start: { x: 42, y: y - 14 }, end: { x: 553, y: y - 14 }, thickness: 0.6, color: line });
    y -= 43;
  }

  page.drawText(KCC_PAYMENT_CONFIG.payeeName, { x: 42, y: 176, size: 12, font: bold, color: ink });
  page.drawText(clean(KCC_PAYMENT_CONFIG.businessAddress), { x: 42, y: 158, size: 9, font: regular, color: muted });
  page.drawText("This computer-generated receipt does not require a signature.", { x: 42, y: 84, size: 8, font: regular, color: muted });

  return pdf.save();
}

