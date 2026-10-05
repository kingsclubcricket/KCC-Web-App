-- Link bookings to reusable client records and provide an atomic payment reversal.

alter table public.bookings
  add column if not exists client_id uuid references public.clients(id) on delete set null;

create index if not exists bookings_client_id_idx
  on public.bookings(client_id);

-- Backfill only unambiguous matches from the imported and newly-created records.
with matches as (
  select b.id as booking_id, (array_agg(c.id))[1] as client_id
  from public.bookings b
  join public.clients c on
    (nullif(lower(trim(b.client_email)), '') is not null and lower(trim(c.email)) = lower(trim(b.client_email)))
    or (nullif(regexp_replace(b.phone, '\D', '', 'g'), '') is not null and regexp_replace(c.phone, '\D', '', 'g') = regexp_replace(b.phone, '\D', '', 'g'))
    or (lower(trim(c.name)) = lower(trim(b.captain_name)) and lower(trim(c.team_name)) = lower(trim(b.team_name)))
  where b.client_id is null
  group by b.id
  having count(distinct c.id) = 1
)
update public.bookings b
set client_id = matches.client_id
from matches
where b.id = matches.booking_id;

create or replace function public.delete_kcc_payment(target_payment_id uuid)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  payment_row public.payments%rowtype;
  booking_row public.bookings%rowtype;
  new_collected numeric;
  new_balance numeric;
begin
  select * into payment_row
  from public.payments
  where id = target_payment_id
  for update;

  if not found then
    raise exception 'Payment could not be found.';
  end if;

  select * into booking_row
  from public.bookings
  where id = payment_row.booking_id
  for update;

  if not found then
    raise exception 'The payment booking could not be found.';
  end if;

  delete from public.payments where id = target_payment_id;

  new_collected := greatest(
    booking_row.collected_amount - case when payment_row.status = 'Paid' then payment_row.amount else 0 end,
    0
  );
  new_balance := greatest(booking_row.total_amount - new_collected, 0);

  update public.bookings
  set collected_amount = new_collected,
      balance_amount = new_balance,
      payment_status = case when new_balance = 0 then 'Settled' else 'Open' end
  where id = booking_row.id;

  if new_balance > 0 then
    update public.invoices
    set status = 'Due', paid_at = null, emailed_at = null
    where booking_id = booking_row.id;

    update public.payment_requests
    set status = case when expires_at > now() then 'Open' else 'Expired' end
    where booking_id = booking_row.id and status = 'Paid';
  end if;
end;
$$;

revoke all on function public.delete_kcc_payment(uuid) from public, anon;
grant execute on function public.delete_kcc_payment(uuid) to authenticated;
