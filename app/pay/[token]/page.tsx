"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useParams } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import QRCode from "qrcode";
import { createUpiUrl, KCC_PAYMENT_CONFIG } from "@/lib/kcc-config";

type PaymentRequest = Record<string, any>;
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const publicSupabase = supabaseUrl && supabaseKey
  ? createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false, autoRefreshToken: false, storageKey: "kcc-public-payment" } })
  : null;

export default function PaymentPage() {
  const params = useParams<{ token: string }>();
  const token = params.token;
  const [request, setRequest] = useState<PaymentRequest | null>(null);
  const [qr, setQr] = useState("");
  const [state, setState] = useState<"loading" | "ready" | "missing">("loading");

  useEffect(() => {
    let current = true;
    async function load() {
      if (token === "demo") {
        const row = { booking_id: "demo0000-0000-0000-0000-000000000000", team_name: "KCC Preview XI", captain_name: "Preview Client", booking_date: "2026-10-18", slot: "10:30:00", amount: 2000, total_amount: 5000, collected_amount: 0, status: "Open" };
        const reference = "KCC-DEMO";
        setRequest(row);
        setQr(await QRCode.toDataURL(createUpiUrl(Number(row.amount), reference), { width: 320, margin: 2, color: { dark: "#171311", light: "#ffffff" } }));
        setState("ready");
        return;
      }
      if (!/^[0-9a-f-]{36}$/i.test(token)) { setState("missing"); return; }
      if (!publicSupabase) { setState("missing"); return; }
      const { data, error } = await publicSupabase.rpc("get_kcc_payment_request", { payment_token: token });
      const row = data?.[0];
      if (!current) return;
      if (error || !row) { setState("missing"); return; }
      const reference = `KCC-${String(row.booking_id).slice(0, 8).toUpperCase()}`;
      setRequest(row);
      setQr(await QRCode.toDataURL(createUpiUrl(Number(row.amount), reference), { width: 320, margin: 2, color: { dark: "#171311", light: "#ffffff" } }));
      setState("ready");
    }
    void load();
    return () => { current = false; };
  }, [token]);

  if (state === "loading") return <main className="customer-page"><section className="customer-card"><span className="eyebrow">KCC GROUND</span><h1>Loading payment request…</h1></section></main>;
  if (state === "missing" || !request) return <main className="customer-page"><section className="customer-card"><span className="eyebrow">KCC GROUND</span><h1>Payment request unavailable</h1><p>This link is invalid, expired, cancelled, or the booking is no longer active. Please contact KCC Ground.</p></section></main>;

  const reference = token === "demo" ? "KCC-DEMO" : `KCC-${String(request.booking_id).slice(0, 8).toUpperCase()}`;
  const upiUrl = createUpiUrl(Number(request.amount), reference);
  const formatted = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(Number(request.amount));
  return <main className="customer-page"><section className="customer-card">
    <div className="customer-brand"><Image src="/kcc-logo.jpeg" alt="KCC Ground" width={58} height={58}/><div><strong>KCC Ground</strong><span>Secure payment request</span></div></div>
    <span className={`status ${request.status === "Paid" ? "paid" : "pending"}`}>{request.status === "Paid" ? "Payment recorded" : "Payment requested"}</span>
    <h1>{formatted}</h1><p>for {request.team_name}&apos;s ground booking</p>
    <dl className="payment-details"><div><dt>Booking</dt><dd>{request.booking_date}</dd></div><div><dt>Slot</dt><dd>{String(request.slot).slice(0, 5)}</dd></div><div><dt>Captain</dt><dd>{request.captain_name}</dd></div><div><dt>Reference</dt><dd>{reference}</dd></div></dl>
    {request.status !== "Paid" && <>{qr && <div className="qr-wrap"><Image src={qr} alt="UPI payment QR code" width={240} height={240} unoptimized/></div>}<a className="primary-button pay-button" href={upiUrl}>Pay {formatted} with UPI</a><div className="payment-number"><span>UPI payment number</span><strong>{KCC_PAYMENT_CONFIG.paymentPhone}</strong><small>Use reference {reference} when paying manually.</small></div><p className="test-note">Prototype QR: the final UPI handle will be connected after testing. No payment is automatically collected in preview mode.</p></>}
    {token === "demo" && <a className="secondary-button demo-invoice" href="/api/invoices/demo" target="_blank">Preview paid invoice PDF</a>}
    <footer>Payment verification is completed by KCC Ground administration.</footer>
  </section></main>;
}
