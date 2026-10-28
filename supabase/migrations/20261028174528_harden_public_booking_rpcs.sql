-- These token-scoped RPCs are consumed exclusively by the anonymous public client.
-- Authenticated administrators use RLS-protected tables directly.

revoke execute on function public.get_kcc_payment_request(uuid) from authenticated;
revoke execute on function public.get_kcc_invoice(uuid) from authenticated;
