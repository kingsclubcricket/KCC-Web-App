alter table public.bookings
  add column if not exists payment_status text not null default 'Open'
    check (payment_status in ('Open', 'Settled'));

alter table public.bookings
  add column if not exists discount_amount numeric(12,2) not null default 0
    check (discount_amount >= 0);

update public.bookings
set payment_status = 'Settled'
where balance_amount = 0 or status = 'Cancelled';

create table if not exists public.tournaments (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  start_date date not null,
  end_date date not null,
  start_time time not null,
  end_time time not null,
  format text not null default '',
  organizer text not null default '',
  contact_phone text not null default '',
  status text not null default 'Upcoming' check (status in ('Upcoming', 'In progress', 'Completed', 'Cancelled')),
  notes text not null default '',
  created_at timestamptz not null default now(),
  check (end_date >= start_date),
  check (end_time > start_time)
);

alter table public.tournaments enable row level security;
revoke all on table public.tournaments from anon, authenticated;
grant select, insert, update, delete on table public.tournaments to authenticated;

create policy "KCC admin select" on public.tournaments for select to authenticated using ((select public.is_kcc_admin()));
create policy "KCC admin insert" on public.tournaments for insert to authenticated with check ((select public.is_kcc_admin()));
create policy "KCC admin update" on public.tournaments for update to authenticated using ((select public.is_kcc_admin())) with check ((select public.is_kcc_admin()));
create policy "KCC admin delete" on public.tournaments for delete to authenticated using ((select public.is_kcc_admin()));
