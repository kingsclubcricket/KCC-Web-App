alter table public.clients add column if not exists source_key text;
create unique index if not exists clients_source_key_unique on public.clients(source_key);

alter table public.bookings add column if not exists collected_amount numeric(12,2) not null default 0 check (collected_amount >= 0);
alter table public.bookings add column if not exists source_booking_id text;
alter table public.bookings add column if not exists source_workbook text;
alter table public.bookings add column if not exists source_sheet text;
alter table public.bookings add column if not exists source_row integer;
create unique index if not exists bookings_source_row_unique on public.bookings(source_sheet, source_row) where source_sheet is not null and source_row is not null;

alter table public.blocked_dates add column if not exists source_sheet text;
alter table public.blocked_dates add column if not exists source_row integer;
create unique index if not exists blocked_dates_source_row_unique on public.blocked_dates(source_sheet, source_row) where source_sheet is not null and source_row is not null;

alter table public.expenses alter column expense_date drop not null;
alter table public.expenses add column if not exists notes text not null default '';
alter table public.expenses add column if not exists source_workbook text;
alter table public.expenses add column if not exists source_sheet text;
alter table public.expenses add column if not exists source_row integer;
create unique index if not exists expenses_source_row_unique on public.expenses(source_sheet, source_row) where source_sheet is not null and source_row is not null;

alter table public.invoices alter column issued_date drop not null;
alter table public.invoices add column if not exists notes text not null default '';
alter table public.invoices add column if not exists source_workbook text;
alter table public.invoices add column if not exists source_sheet text;
alter table public.invoices add column if not exists source_row integer;

create table if not exists public.collections (
  id uuid primary key default gen_random_uuid(),
  collection_date date,
  client_name text not null default '',
  description text not null,
  amount numeric(12,2) not null check (amount >= 0),
  slot text,
  category text not null,
  source_workbook text,
  source_sheet text,
  source_row integer,
  source_key text unique,
  created_at timestamptz not null default now()
);

create table if not exists public.ledger_entries (
  id uuid primary key default gen_random_uuid(),
  entry_date date,
  party text not null default '',
  description text not null,
  amount numeric(12,2),
  raw_amount text not null default '',
  category text not null,
  notes text not null default '',
  source_workbook text,
  source_sheet text,
  source_row integer,
  source_key text unique,
  created_at timestamptz not null default now()
);

alter table public.collections enable row level security;
alter table public.ledger_entries enable row level security;
revoke all on table public.collections, public.ledger_entries from anon, authenticated;
grant select, insert, update, delete on table public.collections, public.ledger_entries to authenticated;

create policy "KCC admin select" on public.collections for select to authenticated using ((select public.is_kcc_admin()));
create policy "KCC admin insert" on public.collections for insert to authenticated with check ((select public.is_kcc_admin()));
create policy "KCC admin update" on public.collections for update to authenticated using ((select public.is_kcc_admin())) with check ((select public.is_kcc_admin()));
create policy "KCC admin delete" on public.collections for delete to authenticated using ((select public.is_kcc_admin()));

create policy "KCC admin select" on public.ledger_entries for select to authenticated using ((select public.is_kcc_admin()));
create policy "KCC admin insert" on public.ledger_entries for insert to authenticated with check ((select public.is_kcc_admin()));
create policy "KCC admin update" on public.ledger_entries for update to authenticated using ((select public.is_kcc_admin())) with check ((select public.is_kcc_admin()));
create policy "KCC admin delete" on public.ledger_entries for delete to authenticated using ((select public.is_kcc_admin()));
