# supabase/ — banco do Splash Pedidos (painel + cardápio)

Fonte de verdade do schema dos **dois** apps. Regras de como mudar: bloco "Banco de dados" no `CLAUDE.md`.

- `migrations/` — histórico do banco, em ordem. `20261011000000_baseline_from_prod.sql` é o ponto de partida: extraído da produção com `pg_dump --schema-only` em 2026-10-11 (schema `public` + buckets e políticas de Storage + trigger em `auth.users` + Realtime de `orders` + event trigger `ensure_rls`). Toda mudança depois disso = arquivo novo aqui, aplicado primeiro no staging.
- `seed.sql` — dados **falsos** pro staging (3 lojas: `loja-a`, `loja-b` e `loja-e2e` dos testes Playwright; produtos cobrindo os casos de preço/estoque/variação/adicional/combo, atendentes). Idempotente. **Nunca rodar na produção.** Usuários de login são criados pelo dashboard (Authentication → Add user) e promovidos por SQL (`update public.profiles set role = ...`).
- `staging-reset.sql` — apaga a estrutura do staging pra recriar do zero (ver abaixo). **Nunca na produção.**
- `../docs/supabase/` — scripts SQL avulsos de antes do baseline (copy_catalog, estoque da revenda, views só-leitura). Já estão contidos no baseline; ficam só como histórico.

Aplicar num banco (psql, connection string do "Session pooler" do projeto):
```bash
psql "$STAGING_DB_URL" -v ON_ERROR_STOP=1 --single-transaction -f supabase/migrations/<arquivo>.sql
```
**Recriar o staging do zero** (validado em 2026-10-11 — reconstrói idêntico à produção e os 6 E2E passam):
```bash
psql "$STAGING_DB_URL" -v ON_ERROR_STOP=1 --single-transaction -f supabase/staging-reset.sql -f supabase/migrations/20261011000000_baseline_from_prod.sql -f supabase/migrations/20261011120000_promotions_bucket_scope_by_store.sql -f supabase/seed.sql
```
(acrescentar cada migration nova, em ordem). Os logins do Auth sobrevivem, mas os perfis somem — repromover: `update public.profiles set role = 'super_admin' where email = 'super@teste.local'` (super), `role = 'store_admin', store_id = <loja>` pra `lojab@teste.local` (loja-b) e `e2e@teste.local` (loja-e2e). Se o perfil não existir, `insert` com o id de `auth.users`.

Conferir se staging e produção estão iguais: `pg_dump --schema-only --schema=public` dos dois e `diff` (só as linhas `\restrict`/`\unrestrict` mudam).
