# Backlog — Splash Pedidos (painel + cardápio)

Pendências dos dois repos num lugar só. Ao concluir um item: tirar daqui, registrar a regra no `CLAUDE.md` (bloco compartilhado se valer pros dois) e o porquê em `docs/historico.md`.
Prioridade: **P0** = risco pra produção/dado real · **P1** = regra de negócio decidida, falta implementar · **P2** = correção/qualidade · **P3** = melhoria.

Origem: revisão + teste ponta a ponta no staging em 2026-10-11, mais o backlog da auditoria anterior (itens com "(aud. N)" = número no relatório original, ver histórico).

## P0 — risco pra produção
- [ ] **Commitar a base do banco**: `supabase/migrations/20261011000000_baseline_from_prod.sql` + `supabase/seed.sql` (ainda não versionados).
- [ ] **Cadastro público do Supabase Auth ligado** (padrão): qualquer um com a chave pública cria conta `customer` pela API. Desligar em Authentication → Sign In / Providers (staging primeiro, depois produção) e confirmar que criar admin pelas Edge Functions continua funcionando.
- [ ] **Plano do Supabase**: produção no plano grátis pausa sozinha após ~7 dias sem uso (aconteceu em 2026-10-08). Avaliar Pro (não pausa, backup diário).

## P1 — regra decidida, falta implementar
- [ ] **Estoque do varejo** (decidido 2026-10-11): com `track_stock` ligado, pedido desconta, cancelamento devolve, pedido acima do saldo é recusado (hoje só recusa com saldo 0 e nunca desconta). Mesmo padrão do trigger da revenda (`order_items_reseller_stock`). Cobrir edição de item no painel (add/update/remove) e cancelamento. Cardápio: limitar quantidade ao saldo e tratar o erro.
- [ ] **Cacau Lover no fechamento** (decidido 2026-10-11): ao avançar pra `finalized`, painel pergunta "Cliente é Cacau Lover?". Gravar no pedido (`orders.is_lover`) e congelar o preço Lover nos itens (`order_items.lover_unit_price`, e nos adicionais/variações) no `confirm_order`. Relatórios somam pelo preço que valeu.
- [ ] **Status inicial no histórico**: `confirm_order` não grava `received` em `order_status_history` (o tempo de preparo fica sem ponto de partida).
- [ ] **Cancelar exige motivo na função**: `change_order_status` ainda aceita cancelar sem `p_reason`. Travar quando o painel em produção já mandar motivo.
- [ ] **Tirar transições antigas**: `change_order_status` ainda aceita `out_for_delivery → finalized` e `preparing → finalized` (mesa), deixadas por compatibilidade com o front antigo. Remover quando a produção estiver com o fluxo `delivered`.
- [ ] **Ordem das opções no cardápio**: views `public_product_addon_groups`/`public_product_variation_groups` ordenam opções por `id`; trocar por `sort_order` (a ordem arrastada no painel não chega ao cliente).

## P2 — correção / qualidade
- [ ] Funções/triggers do banco sem `search_path` fixo (ex: `check_product_category_store` usa `categories` sem schema): dependem do search_path de quem chama — quebraram a reconstrução do banco do zero até o seed definir o search_path. Fixar `set search_path = public` nas funções (migration).
- [ ] Apagar a versão antiga `add_order_item(uuid, uuid, integer)` (sobra; qualquer chamada de 3 argumentos dá erro de ambiguidade).
- [ ] Versionar as Edge Functions `setup-first-admin`, `create-admin-user`, `update-admin-user`, `delete-admin-user` (hoje só existem no Supabase; baixar com `supabase functions download`) e publicar no staging.
- [ ] Erro HTTP 400 no carregamento do painel (sem efeito visível; origem não identificada — olhar Logs → API no dashboard do Supabase).
- [ ] Cardápio: revisão do pedido não mostra a observação do item.
- [ ] Cardápio: `/atacado` redireciona pra `/cardapio` e o canal (varejo/atacado) fica só em memória (`useOrderType` sem `persist`) — F5 na revenda volta pro varejo. Persistir canal/tipo (sessionStorage) ou manter na URL.
- [ ] Cardápio: ícone de sacola no topo abre "Meus pedidos", não o carrinho (confunde).
- [ ] Acessibilidade no cardápio: opções de adicional (radio/checkbox) e campos de endereço sem nome acessível (label não associado).
- [ ] Painel: bundle único de 2,3 MB — `React.lazy` por rota (exceljs/recharts só carregam onde usam).
- [ ] View `public_products` expõe produto inativo (sem `where active`) — cardápio filtra no client; avaliar filtrar na view.
- [ ] Trilha de auditoria das edições de item de pedido (`add/update/remove_order_item` não registram quem mudou) (aud. 7).
- [ ] `saveComboItems` faz delete+insert sem transação (aud. 8).
- [ ] `promotion_combo_items` não valida que o produto é da mesma loja da promoção (aud. 9).
- [ ] Reimpressão de cupom (aud. 10).
- [ ] N+1 no seletor de variação/adicional do painel (aud. 11).
- [ ] Busca `ilike '%termo%'` sem índice e sensível a acento — `unaccent` + trigram (aud. 13, 25).
- [ ] Conferir índices: `orders (store_id, created_at desc)`, `orders (store_id, customer_phone)`, `promotion_combo_items (promotion_id)` — agora dá pra ler na migration (aud. 14).
- [ ] `listPrecedingCustomerPhones` com `.in()` grande (aud. 15); `count: 'exact'` no Histórico "Tudo" (aud. 16).
- [ ] `useFinalizeTableOrders` sem atomicidade (aud. 20); `#print-receipt-root` órfão (aud. 21); link "Ver cardápio" sem checar `VITE_STOREFRONT_URL` (aud. 22); `AdminUserRepository.list()` sem paginação (aud. 23); desconto aceita 0 (aud. 24).
- [ ] Copiar catálogo: copia `cost_price` (aud. 26); foto que falha fica com URL da origem (aud. 27); produto entra ativo antes da foto (aud. 28); confirmação por senha via `signInWithPassword` (aud. 29).
- [ ] `itemTotal` duplicado entre `orderCardFormat.ts` e `orderPricing.ts` (aud. 18); `PromotionModal.tsx` grande demais (aud. 19).

## P3 — melhorias / Fase 2
- [ ] Monorepo (Turborepo + pnpm workspaces) juntando painel + cardápio — aí o bloco compartilhado vira 1 arquivo só.
- [ ] CI rodando test/lint/build + `scripts/check-shared-rules.mjs` em PR.
- [ ] Estoque em tempo real no cardápio (hoje só confere ao listar e ao confirmar).
- [ ] Drop futuro do que está aposentado: `products.category` (texto), `products.available_delivery`, `orders.customer_id`, papel `customer` — só depois que nenhum código usar.
