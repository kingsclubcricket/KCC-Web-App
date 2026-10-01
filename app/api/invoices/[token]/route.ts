import { createPublicSupabase } from "@/lib/public-supabase";
import { buildInvoicePdf, type InvoiceDetails } from "@/lib/invoice-pdf";

export const runtime = "nodejs";

export async function GET(_request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (token === "demo") {
    const sample: InvoiceDetails = { invoice_number: "KCC-DEMO-001", issued_date: "2026-10-01", client_name: "Preview Client", client_email: "preview@example.com", amount: 5000, status: "Paid", booking_date: "2026-10-18", slot: "10:30:00", team_name: "KCC Preview XI", captain_name: "Preview Client", payment_reference: "DEMO-UTR-001" };
    const sampleBytes = await buildInvoicePdf(sample);
    return new Response(new Uint8Array(sampleBytes), { headers: { "Content-Type": "application/pdf", "Content-Disposition": 'attachment; filename="KCC-DEMO-001.pdf"', "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" } });
  }
  if (!/^[0-9a-f-]{36}$/i.test(token)) return new Response("Invoice not found", { status: 404 });
  const supabase = createPublicSupabase();
  const { data, error } = await supabase.rpc("get_kcc_invoice", { invoice_token: token });
  const invoice = data?.[0] as InvoiceDetails | undefined;
  if (error || !invoice) return new Response("Invoice not found", { status: 404 });
  const bytes = await buildInvoicePdf({ ...invoice, amount: Number(invoice.amount) });
  return new Response(new Uint8Array(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${invoice.invoice_number}.pdf"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
