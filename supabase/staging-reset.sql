-- RESET DO STAGING — apaga TODA a estrutura e os dados do schema public.
-- NUNCA rodar na producao. Uso (sempre tudo numa transacao so):
--   psql "$STAGING_DB_URL" -v ON_ERROR_STOP=1 --single-transaction \
--     -f supabase/staging-reset.sql -f supabase/migrations/<cada arquivo, em ordem> -f supabase/seed.sql
-- Depois: reaplicar papeis dos logins de teste (ver supabase/README.md).
drop policy if exists "Public read promotions images" on storage.objects;
drop policy if exists "product images delete scoped by store" on storage.objects;
drop policy if exists "product images upload scoped by store" on storage.objects;
drop policy if exists "promotions images upload scoped by store" on storage.objects;
drop event trigger if exists ensure_rls;
drop schema public cascade;
create schema public;
-- igual ao schema public de um projeto Supabase novo (dono e acesso padrao)
alter schema public owner to pg_database_owner;
grant usage on schema public to public;
grant usage on schema public to postgres;
