create or replace function public.is_kcc_admin()
returns boolean language sql stable security invoker set search_path = ''
as $$ select coalesce(lower((select auth.jwt()->>'email')) = 'kingsclubcricket@gmail.com', false) $$;
