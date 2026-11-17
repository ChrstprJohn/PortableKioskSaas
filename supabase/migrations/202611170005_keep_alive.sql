-- Allow a scheduler to verify database activity without reading application data.
create function public.kiosk_keep_alive()
returns timestamptz
language sql stable security invoker set search_path = ''
as $$ select pg_catalog.statement_timestamp() $$;

revoke all on function public.kiosk_keep_alive() from public;
grant execute on function public.kiosk_keep_alive() to anon;

notify pgrst, 'reload schema';
