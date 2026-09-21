-- ============================================================================
-- Hardening: views públicas do storefront são SOMENTE LEITURA
-- Cópia de referência — o que roda de verdade está no Supabase (SQL Editor).
-- Idempotente: rodar de novo é seguro.
--
-- Contexto: essas views não são security_invoker (rodam como o dono, sem RLS da tabela
-- de origem) e o Supabase concede INSERT/UPDATE/DELETE/TRUNCATE a anon e authenticated
-- por padrão. Sendo views simples (auto-atualizáveis), um UPDATE nelas passa por cima da
-- RLS — ex.: PATCH /rest/v1/public_stores?id=eq.<id> {"active": false}, sem login.
-- O storefront só LÊ essas views; o admin escreve nas tabelas, nunca nas views. Tirar a
-- escrita não muda nada do que existe hoje. SELECT continua igual.
--
-- public_products já foi tratada em reseller_storefront.sql (seção 3).
-- ============================================================================
revoke insert, update, delete, truncate, references, trigger
  on public.public_product_addon_groups     from anon, authenticated;
revoke insert, update, delete, truncate, references, trigger
  on public.public_product_variation_groups from anon, authenticated;
revoke insert, update, delete, truncate, references, trigger
  on public.public_promotion_combo_items    from anon, authenticated;
revoke insert, update, delete, truncate, references, trigger
  on public.public_promotions               from anon, authenticated;
revoke insert, update, delete, truncate, references, trigger
  on public.public_stores                   from anon, authenticated;

-- Conferir (não deve listar nenhuma linha):
--   select table_name, grantee, string_agg(privilege_type, ', ') as escrita
--   from information_schema.role_table_grants
--   where grantee in ('anon', 'authenticated')
--     and privilege_type in ('INSERT', 'UPDATE', 'DELETE', 'TRUNCATE')
--     and table_name in (select viewname from pg_views where schemaname = 'public')
--   group by table_name, grantee;
--
-- Regra pra view nova: criar já com
--   revoke insert, update, delete, truncate, references, trigger on public.<view> from anon, authenticated;
-- (ou usar WITH (security_invoker = true) quando a RLS da tabela de origem já serve).
