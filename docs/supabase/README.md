# docs/supabase — cópias de referência

Na Fase 1 o schema, RPCs e Edge Functions são aplicados **direto no painel do Supabase**
(SQL Editor / Edge Functions), sem migration versionada — ver CLAUDE.md, "Fases do projeto".

Os arquivos aqui **não executam** deste repositório. São o **texto-fonte versionado** do que
está vivo no Supabase, pra dar histórico no git, permitir review e reconstruir se algo for
apagado por engano. Ao alterar a RPC / Edge Function no painel, atualize o arquivo
correspondente aqui e commite junto.

A Fase 2 substitui isto por `supabase/migrations` (versionado e aplicado por CI).

| Arquivo | O que é | Onde roda de verdade |
|---|---|---|
| `copy_catalog.sql` | tabela `catalog_copy_log` + RLS + RPC `copy_catalog` | Supabase → SQL Editor |
| `copy-catalog/index.ts` | Edge Function `copy-catalog` | Supabase → Edge Functions |
