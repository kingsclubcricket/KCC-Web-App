-- First-class all-day ground bookings with database-enforced active-slot overlap protection.

create extension if not exists btree_gist with schema extensions;

alter table public.bookings
  add column if not exists is_all_day boolean not null default false;

alter table public.bookings
  drop constraint if exists bookings_booking_date_slot_key;

alter table public.bookings
  add constraint bookings_supported_slot_check
  check (slot in (time '07:00', time '10:30', time '14:00'));

alter table public.bookings
  add constraint bookings_active_slot_no_overlap
  exclude using gist (
    booking_date with =,
    (
      int4range(
        case
          when is_all_day then 0
          when slot = time '07:00' then 0
          when slot = time '10:30' then 1
          when slot = time '14:00' then 2
        end,
        case
          when is_all_day then 3
          when slot = time '07:00' then 1
          when slot = time '10:30' then 2
          when slot = time '14:00' then 3
        end,
        '[)'
      )
    ) with &&
  )
  where (status <> 'Cancelled');

drop function if exists public.get_kcc_payment_request(uuid);

create function public.get_kcc_payment_request(payment_token uuid)
returns table (
  request_id uuid,
  booking_id uuid,
  team_name text,
  captain_name text,
  client_email text,
  booking_date date,
  slot time,
  is_all_day boolean,
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
    b.booking_date, b.slot, b.is_all_day, pr.amount, b.total_amount,
    b.collected_amount, pr.status, pr.expires_at
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

drop function if exists public.get_kcc_invoice(uuid);

create function public.get_kcc_invoice(invoice_token uuid)
returns table (
  invoice_number text,
  issued_date date,
  client_name text,
  client_email text,
  amount numeric,
  status text,
  booking_date date,
  slot time,
  is_all_day boolean,
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
    i.amount, i.status, b.booking_date, b.slot, b.is_all_day, b.team_name,
    b.captain_name, coalesce((
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
