create index if not exists notification_events_invoice_id_idx
  on public.notification_events(invoice_id);

-- Customer access is capability-based through a 122-bit random UUID token.
-- Signed-in users do not need these public RPCs because the admin UI uses RLS tables.
revoke execute on function public.get_kcc_payment_request(uuid) from authenticated;
revoke execute on function public.get_kcc_invoice(uuid) from authenticated;
