-- Booking payments, customer payment requests, notification history, and invoices.
-- This migration is additive so existing imported workbook records remain intact.

alter table public.bookings
  add column if not exists client_email text not null default '';

alter table public.invoices
  add column if not exists booking_id uuid references public.bookings(id) on delete set null,
  add column if not exists client_email text not null default '',
  add column if not exists public_token uuid not null default gen_random_uuid(),
  add column if not exists paid_at timestamptz,
  add column if not exists emailed_at timestamptz;

create unique index if not exists invoices_booking_unique
  on public.invoices(booking_id) where booking_id is not null;
create unique index if not exists invoices_public_token_unique
  on public.invoices(public_token);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  amount numeric(12,2) not null check (amount > 0),
  payment_type text not null default 'Balance'
    check (payment_type in ('Advance', 'Balance', 'Full', 'Adjustment')),
  method text not null default 'UPI'
    check (method in ('UPI', 'Cash', 'Bank transfer', 'Payment link', 'Other')),
  status text not null default 'Paid'
    check (status in ('Pending', 'Paid', 'Failed', 'Refunded')),
  reference text not null default '',
  notes text not null default '',
  paid_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists payments_booking_id_idx on public.payments(booking_id);
create index if not exists payments_paid_at_idx on public.payments(paid_at desc);

create table if not exists public.payment_requests (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  public_token uuid not null default gen_random_uuid() unique,
  amount numeric(12,2) not null check (amount > 0),
  status text not null default 'Open'
    check (status in ('Open', 'Paid', 'Cancelled', 'Expired')),
  expires_at timestamptz not null default (now() + interval '7 days'),
  created_at timestamptz not null default now()
);

create index if not exists payment_requests_booking_id_idx on public.payment_requests(booking_id);

create table if not exists public.notification_events (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid references public.bookings(id) on delete cascade,
  invoice_id uuid references public.invoices(id) on delete set null,
  recipient text not null,
  notification_type text not null
    check (notification_type in ('Booking confirmation', 'Payment request', 'Payment receipt', 'Invoice')),
  subject text not null,
  status text not null default 'Preview'
    check (status in ('Preview', 'Queued', 'Sent', 'Failed')),
  provider_id text not null default '',
  error_message text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists notification_events_booking_id_idx on public.notification_events(booking_id);
create index if not exists notification_events_created_at_idx on public.notification_events(created_at desc);

do $$ declare table_name text; begin
  foreach table_name in array array['payments','payment_requests','notification_events'] loop
    execute format('alter table public.%I enable row level security', table_name);
    execute format('revoke all on table public.%I from anon, authenticated', table_name);
    execute format('grant select, insert, update, delete on table public.%I to authenticated', table_name);
    execute format('create policy "KCC admin select" on public.%I for select to authenticated using ((select public.is_kcc_admin()))', table_name);
    execute format('create policy "KCC admin insert" on public.%I for insert to authenticated with check ((select public.is_kcc_admin()))', table_name);
    execute format('create policy "KCC admin update" on public.%I for update to authenticated using ((select public.is_kcc_admin())) with check ((select public.is_kcc_admin()))', table_name);
    execute format('create policy "KCC admin delete" on public.%I for delete to authenticated using ((select public.is_kcc_admin()))', table_name);
  end loop;
end $$;

-- Explicit grants keep these tables available to authenticated admins after the
-- Data API auto-exposure default changes. Anonymous visitors never receive
-- table access; the two narrow RPCs below expose only a valid token's record.
grant select, insert, update, delete on table public.bookings, public.invoices to authenticated;

create or replace function public.get_kcc_payment_request(payment_token uuid)
returns table (
  request_id uuid,
  booking_id uuid,
  team_name text,
  captain_name text,
  client_email text,
  booking_date date,
  slot time,
  amount numeric,
  total_amount numeric,
  collected_amount numeric,
  status text,
  expires_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select pr.id, b.id, b.team_name, b.captain_name, b.client_email,
    b.booking_date, b.slot, pr.amount, b.total_amount, b.collected_amount,
    pr.status, pr.expires_at
  from public.payment_requests pr
  join public.bookings b on b.id = pr.booking_id
  where pr.public_token = payment_token
    and pr.status in ('Open', 'Paid')
    and pr.expires_at > now()
    and b.status <> 'Cancelled'
  limit 1
$$;

revoke all on function public.get_kcc_payment_request(uuid) from public;
grant execute on function public.get_kcc_payment_request(uuid) to anon, authenticated;

create or replace function public.get_kcc_invoice(invoice_token uuid)
returns table (
  invoice_number text,
  issued_date date,
  client_name text,
  client_email text,
  amount numeric,
  status text,
  booking_date date,
  slot time,
  team_name text,
  captain_name text,
  payment_reference text
)
language sql
stable
security definer
set search_path = ''
as $$
  select i.invoice_number, i.issued_date, i.client_name, i.client_email,
    i.amount, i.status, b.booking_date, b.slot, b.team_name, b.captain_name,
    coalesce((
      select p.reference from public.payments p
      where p.booking_id = b.id and p.status = 'Paid'
      order by p.paid_at desc nulls last, p.created_at desc limit 1
    ), '')
  from public.invoices i
  join public.bookings b on b.id = i.booking_id
  where i.public_token = invoice_token and i.status = 'Paid'
  limit 1
$$;

revoke all on function public.get_kcc_invoice(uuid) from public;
grant execute on function public.get_kcc_invoice(uuid) to anon, authenticated;

