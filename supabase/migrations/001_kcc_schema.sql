create extension if not exists pgcrypto;

create or replace function public.is_kcc_admin()
returns boolean language sql stable security invoker set search_path = ''
as $$ select coalesce((select auth.jwt()->>'email') = 'kccground@gmail.com', false) $$;

create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(), name text not null, team_name text not null,
  phone text default '', email text default '', status text not null default 'Active', notes text default '', created_at timestamptz not null default now()
);
create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(), booking_date date not null, slot time not null,
  team_name text not null, captain_name text not null, phone text default '',
  advance_amount numeric(12,2) not null default 0 check (advance_amount >= 0),
  balance_amount numeric(12,2) not null default 0 check (balance_amount >= 0),
  total_amount numeric(12,2) not null default 0 check (total_amount >= 0),
  status text not null default 'Pending' check (status in ('Confirmed','Pending','Cancelled')),
  notes text default '', created_at timestamptz not null default now(), unique (booking_date, slot)
);
create table if not exists public.blocked_dates (
  id uuid primary key default gen_random_uuid(), blocked_date date not null, slot text not null, reason text not null, created_at timestamptz not null default now()
);
create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(), expense_date date not null, item text not null,
  category text not null, amount numeric(12,2) not null check (amount >= 0), status text not null default 'Paid', created_at timestamptz not null default now()
);
create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(), invoice_number text not null unique, issued_date date not null,
  client_name text not null, amount numeric(12,2) not null check (amount >= 0), status text not null default 'Due', created_at timestamptz not null default now()
);
create table if not exists public.maintenance_tasks (
  id uuid primary key default gen_random_uuid(), title text not null, description text default '', category text not null,
  priority text not null default 'Routine', status text not null default 'To do', due_date date, created_at timestamptz not null default now()
);

do $$ declare table_name text; begin
  foreach table_name in array array['clients','bookings','blocked_dates','expenses','invoices','maintenance_tasks'] loop
    execute format('alter table public.%I enable row level security', table_name);
    execute format('revoke all on table public.%I from anon, authenticated', table_name);
    execute format('grant select, insert, update, delete on table public.%I to authenticated', table_name);
    execute format('create policy "KCC admin select" on public.%I for select to authenticated using ((select public.is_kcc_admin()))', table_name);
    execute format('create policy "KCC admin insert" on public.%I for insert to authenticated with check ((select public.is_kcc_admin()))', table_name);
    execute format('create policy "KCC admin update" on public.%I for update to authenticated using ((select public.is_kcc_admin())) with check ((select public.is_kcc_admin()))', table_name);
    execute format('create policy "KCC admin delete" on public.%I for delete to authenticated using ((select public.is_kcc_admin()))', table_name);
  end loop;
end $$;
