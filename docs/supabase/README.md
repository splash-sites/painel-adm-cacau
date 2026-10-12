# docs/supabase — histórico (não executa)

Scripts SQL avulsos de antes do baseline (`supabase/migrations/20261011000000_baseline_from_prod.sql`),
quando schema e RPCs eram aplicados direto no SQL Editor. Já estão contidos no baseline; ficam só
como histórico. Fonte de verdade hoje:

- banco → `supabase/migrations/`
- Edge Functions → `supabase/functions/` (inclusive `copy-catalog`, que antes ficava aqui)

| Arquivo | O que é |
|---|---|
| `copy_catalog.sql` | tabela `catalog_copy_log` + RLS + RPC `copy_catalog` |
| `reseller_stock.sql`, `reseller_storefront*.sql` | estoque e cardápio da revenda |
| `public_views_readonly.sql` | views `public_*` só leitura |
