# CLAUDE.md — Painel administrativo (Splash Pedidos)

Regras **vigentes**. Histórico de decisões, features e auditorias (o "porquê" de cada coisa): [docs/historico.md](docs/historico.md). Pendências: [docs/backlog.md](docs/backlog.md). Banco: [supabase/](supabase/).

## Comandos
```bash
pnpm install                 # dependências
pnpm dev                     # contra PRODUÇÃO (.env.local) — só leitura
pnpm dev --mode staging      # contra STAGING (.env.staging.local) — use este pra testar
pnpm test                    # Vitest (unitário)
pnpm test:e2e                # Playwright contra o STAGING (loja-e2e). Precisa E2E_TEST_EMAIL/E2E_TEST_PASSWORD (store_admin da loja-e2e) no .env.staging.local
pnpm lint                    # oxlint
pnpm build                   # tsc -b + vite build
node scripts/check-shared-rules.mjs   # confere se o bloco "Regras compartilhadas" bate com o do cacau-cardapio
```
`VITE_STOREFRONT_URL` (no `.env*.local`) aponta pro cardápio — usado no link "Ver cardápio" e nos QR Codes de mesa. Local: `http://localhost:5175` (cardápio rodando com `--port 5175`).

<!-- REGRAS-COMPARTILHADAS:INICIO -->
## Regras compartilhadas (Splash Pedidos)

> **Este bloco é idêntico no `CLAUDE.md` do `painel-adm-cacau` e do `cacau-cardapio`.** Mudou aqui, muda lá no mesmo commit — `node scripts/check-shared-rules.mjs` compara os dois e falha se divergirem. Última conferência contra o banco real: 2026-10-11.

### Produto e repositórios
- **Splash Pedidos**: SaaS de pedidos multi-loja. Primeira cliente: Kaká o Show (Cacau Show Torres e Capão da Canoa). Tudo precisa servir qualquer loja futura — nada de nome de loja fixo no código.
- `painel-adm-cacau` = painel da loja (login, pedidos, catálogo, relatórios). `cacau-cardapio` = cardápio do cliente final (sem login). Os dois falam **direto** com o mesmo Supabase (sem backend próprio); deploy de cada um na Vercel.
- Lugar de cada coisa: regra vigente → `CLAUDE.md` · decisões antigas e o porquê → `docs/historico.md` · pendências → `painel-adm-cacau/docs/backlog.md` · banco → `painel-adm-cacau/supabase/`.

### Ambientes
| | Supabase | Como rodar local |
|---|---|---|
| **Produção** | projeto `ybvg…sscg` — clientes reais | `.env.local` → `pnpm dev` |
| **Staging** | projeto `splash-pedidos-staging` (`nybq…jmvr`) — só dado falso | `.env.staging.local` → `pnpm dev --mode staging` |

- **Teste que grava dado (pedido, status, cadastro) é só no staging.** Produção: só leitura, ou ação real da loja.
- Staging tem lojas falsas (`loja-a`, `loja-b` e `loja-e2e`, usada só pelos testes Playwright) e logins `super@teste.local` (super_admin) e `lojab@teste.local` (store_admin da Loja B). Recriar dados: `supabase/seed.sql`.
- **Testes E2E (Playwright) só rodam contra o staging**: o `playwright.config.ts` sobe o app com `--mode staging` e se recusa a rodar se o `.env.staging.local` faltar ou apontar pro mesmo Supabase da produção.
- Senha do banco (connection string) **nunca** em variável `VITE_*` (vai pro JavaScript público) e nunca no repo. Front só usa a chave `sb_publishable_…`.
- Projeto no plano grátis do Supabase **pausa sozinho após ~7 dias sem uso** — já derrubou a produção uma vez (2026-10-08). Plano Pro (não pausa, tem backup diário) é o recomendado enquanto houver cliente real.

### Banco de dados — fonte de verdade e como mudar
- **Fonte de verdade = `painel-adm-cacau/supabase/migrations/`.** O baseline (`20261011000000_baseline_from_prod.sql`) foi extraído da produção com `pg_dump`. Nenhum doc lista coluna por coluna — pra saber o schema, ler a migration.
- **Toda mudança de banco (tabela, coluna, RLS, função, trigger, grant):**
  1. vira um arquivo novo em `supabase/migrations/` (`AAAAMMDDHHMMSS_descricao.sql`), nunca editar migration já aplicada;
  2. aplica e testa no **staging**;
  3. só depois aplica na **produção**, mesmo arquivo;
  4. atualiza este bloco se mudou alguma regra.
  SQL Editor direto na produção, sem migration, está proibido.
- **Mudança sempre retrocompatível** (o banco serve `main` e `dev` ao mesmo tempo): coluna nova opcional ou com default; nunca renomear/remover coluna ou apertar regra que o código em produção ainda usa — primeiro sai o código, depois o banco.
- **Mudar assinatura de função** (`create or replace` com parâmetro novo) cria **outra versão** em vez de substituir. Sempre `drop function` da antiga na mesma migration e conferir: `select oid::regprocedure from pg_proc where proname = '<nome>'` tem que voltar 1 linha.
- **View pública nova**: criar já com `revoke insert, update, delete` de `anon`/`authenticated` (as views `public_*` não são `security_invoker`; com escrita liberada, passariam por cima do RLS).
- Event trigger `ensure_rls` liga RLS sozinho em tabela nova — mas política (quem lê/escreve) continua sendo escrita à mão e **testada** (ver Segurança).

### Separação entre lojas e segurança
- Toda tabela de domínio tem `store_id`. **RLS ligado em todas as 20 tabelas.** `super_admin` vê todas as lojas; `store_admin` só a dele (`current_role()`, `current_store_id()`). Testado 2026-10-11 no staging: Loja B não lê nem altera nada da Loja A.
- Filtro só no front não é segurança — quem garante é RLS + checagem dentro da função.
- **Cliente final nunca lê tabela de pedido.** Lê só as views `public_*` (sem `cost_price`/`external_code`) e escreve/consulta só por função: `confirm_order`, `get_order_status` (exige id do pedido + CPF), `list_orders_by_cpf` (sem endereço).
- **Funções do banco**: estão executáveis por qualquer um (`PUBLIC`), então **cada função confere por dentro quem chamou** (papel e loja). Testado 2026-10-11: todas recusam chamada de outra loja e de anônimo. Função nova segue a mesma regra; funções só de sistema (`copy_catalog`, `reseller_stock_apply`) têm `revoke` e só rodam via `service_role`/trigger.
- **Edge Functions** (rodam com `service_role`, sempre validam o JWT de quem chamou antes; `verify_jwt` ligado em todas): `setup-first-admin`, `create-admin-user`, `update-admin-user`, `delete-admin-user`, `copy-catalog`. Fonte de verdade = `painel-adm-cacau/supabase/functions/`; mesmo fluxo do banco (staging primeiro, depois produção — comandos no `supabase/README.md`). Testado 2026-10-11 no staging: sem login → 401, `store_admin` → 403.
- `service_role` nunca no front.
- Antes de dar feature como pronta no painel: rodar o agente `security-sweep` (`painel-adm-cacau/.claude/agents/`). Achado CRÍTICO/ALTO bloqueia.

### Contas e identificação
- **Cliente final não tem conta** (decisão 2026-10-11). Identifica-se por nome + CPF + telefone a cada pedido; "Meus pedidos" = digitar o CPF de novo. Risco aceito: quem souber o CPF vê os pedidos (itens e status, sem endereço). Se deixar de ser aceitável, a saída é código por SMS (Supabase Auth), nunca algo caseiro.
- No banco sobrou a conta de cliente pela metade (`orders.customer_id`, papel `customer`, trigger `handle_new_user`) — **sem uso, não construir em cima**. **Cadastro público do Supabase Auth desligado** (staging e produção, 2026-10-11): ninguém cria conta pela API; logins só nascem pelas Edge Functions (`auth.admin.createUser`).
- Login só no painel: `super_admin` e `store_admin`, criados pelas Edge Functions. Papel e loja só se definem na criação.

### Pedido: status
- `received → preparing → out_for_delivery → delivered → finalized`. **Mesa (`dine_in`) pula `out_for_delivery`.** `cancelled` só a partir de `received`.
- `out_for_delivery` aparece como "Saiu pra entrega" (entrega) ou "Pronto pra retirada" (retirada) — mesmo valor no banco, rótulo muda pelo tipo.
- `delivered` = entregue fisicamente. `finalized` = pago/fechado pela atendente (orientação de uso, o sistema não confere pagamento).
- Aceitar (`received → preparing`) **exige atendente**; o atendente fica gravado no pedido.
- Toda transição passa por `change_order_status`/`revert_order_status` e grava em `order_status_history` (quem e quando). O status inicial também entra no histórico, na hora em que o pedido nasce (trigger `orders_initial_status_history`). Voltar etapa só até `delivered`. Editar itens só em `received`.
- Cancelar pede motivo na tela (`orders.cancellation_reason`); a função ainda aceita sem motivo — travar é backlog.
- Pedido de mesa entra sozinho na comanda aberta da mesa (trigger `assign_table_session`); a comanda fecha manual, pelo painel.

### Preço
- **Preço nunca vem do front.** `confirm_order` recalcula tudo no servidor (produto, variação, adicional, combo/desconto) e grava cópia congelada no item (`order_items.unit_price`, `order_item_addons`, `order_item_variations`). Mudar preço depois não altera pedido feito.
- **`order_items.unit_price` = preço da unidade JÁ COM as variações** (e com o desconto do combo, se for combo). Total do item = (`unit_price` + adicionais por unidade) × quantidade — nunca reaplicar variação em cima (contava duas vezes / tirava o desconto do combo; corrigido 2026-10-11). Vale pra `confirm_order` e pra `add_order_item`/`update_order_item` do painel (`catalog_unit_prices`). Trocar variação de item de combo no painel é recusado.
- Variação: obrigatória (1 por grupo vinculado). `replace` substitui o preço do produto; `additive` soma. Adicional: opcional, sempre soma, fora do desconto de combo.
- **Cacau Lover**: preço menor mostrado lado a lado em produto, adicional e variação (`lover_price`; vazio = mesmo preço). Todo pedido congela também o preço Lover (`order_items.lover_unit_price`, mesma convenção do `unit_price`; `order_item_variations/addons.lover_price`) — calculado no fim da transação (`order_freeze_lover_prices`, constraint trigger adiado). Ao finalizar, o painel pergunta "Cliente é Cacau Lover?" (só se o Lover for mais barato) e grava `orders.is_lover` (`set_order_lover`); Relatórios somam pelo preço que valeu. `is_lover` null = não perguntado = preço normal. (Staging desde 2026-10-11; produção pendente — backlog.)
- Combo/desconto: promoção = produto principal + itens extras (`promotion_combo_items`) + desconto opcional (percentual ou valor fixo), validado dentro de `confirm_order`. Desconto vale também sobre o Lover.

### Estoque
- **Varejo**: chave por produto `track_stock`. Ligada = conta unidades em `stock_quantity`: pedido desconta, editar item ajusta, remover item ou cancelar devolve, pedido acima do saldo é recusado (`Estoque insuficiente para "X"`) — triggers `order_items_retail_stock_ins_upd`/`_del` e `orders_retail_stock_restore`, só pedido `sales_channel = 'retail'`. Cada item guarda quanto descontou (`order_items.retail_stock_debited`) e só isso volta: pedido feito com o controle desligado não devolve nada. Desligada = ignora estoque. (Staging desde 2026-10-11; produção pendente — backlog.)
- **Revenda (atacado)**: estoque próprio (`reseller_stock_quantity`, chave `reseller_track_stock`), mesma regra, triggers `order_items_reseller_stock`/`orders_reseller_stock_restore`. Um canal nunca mexe no saldo do outro.

### Canais e cardápio
- Tipos de pedido: `dine_in` (mesa/cafeteria), `pickup` (retirada), `delivery` (entrega). Loja liga cada um em `stores.supports_*`.
- No cardápio, retirada e entrega são **um cardápio só**, filtrado por `available_pickup`. `available_delivery` está aposentado (fica no banco, ninguém usa).
- **Revenda** (`/:slug/atacado`, só se `stores.reseller_enabled`): filtra por `available_reseller`, pedido com `sales_channel = 'reseller'`, só retirada (nunca mesa).
- Mesa via QR: `/:slug/mesa/:numero` (gerado em Configurações do painel com `VITE_STOREFRONT_URL`).
- Ordem no cardápio: categorias, produtos, grupos de adicional/variação e as opções dentro de cada grupo, todos por `sort_order`, definida no painel.

### Git, deploy e verificação
- `main` = produção (deploy automático na Vercel). `dev` = dia a dia (Preview Deployment). Release: `git checkout main && git merge dev && git tag vX.Y.Z && git push origin main --tags`. Hotfix: branch da `main` → merge na `main` **e** na `dev`.
- Vercel (2026-10-11): variáveis `VITE_SUPABASE_*` separadas por ambiente, tipo Config — **Production → banco de produção**, **Preview (`dev` e outras branches) → staging**. Mudou variável? Redeploy (ela entra no build).
- Antes de dar qualquer tarefa como pronta: `pnpm test`, `pnpm lint`, `pnpm build` limpos **e** ver funcionando no navegador contra o staging. Type-check não substitui ver a tela.
- Arquitetura dos dois apps: `domain` (regra pura, sem React/Supabase) → `application` (portas e casos de uso) → `infrastructure` (Supabase) → `presentation` (React). Dependência sempre de fora pra dentro; componente nunca importa o client Supabase.
- Textos de interface do lado de quem usa (o botão "Confirmar pedido" gera "Pedido confirmado"); foco de teclado sempre visível; respeitar `prefers-reduced-motion`.
<!-- REGRAS-COMPARTILHADAS:FIM -->

## Este app — painel administrativo

### Stack
React 19 + Vite 8 + TypeScript `strict` · Tailwind v4 (`@tailwindcss/vite`, tokens no `@theme` de `src/index.css`) · TanStack Query (servidor) + Zustand com `persist` (loja ativa, notificação por loja, "zerar finalizados") · React Hook Form + Zod · Radix UI em `presentation/ui/` (`Button`, `Select`, `Dialog`, `Combobox` com `cmdk`, `SortableList` com `@dnd-kit`…) + `cn()` · `lucide-react`, `sonner`, `recharts`, `exceljs`, `qrcode` · Vitest + Playwright · pnpm.

### Papéis e telas
| Rota | Tela | Quem vê |
|---|---|---|
| `/` | Dashboard de pedidos (kanban em tempo real + resumo de comanda de mesa) | todos |
| `/historico` | Histórico de pedidos (qualquer status, paginado) | todos |
| `/produtos` (+ `/ordenar`, `/importar`, `/adicionais`, `/variacoes`, `/categorias`) | Catálogo | todos |
| `/promocoes` | Carrossel, combo e desconto | todos |
| `/revendedores` | Estoque e pedidos do canal revenda (só se `reseller_enabled`) | todos |
| `/atendentes` | Quem prepara o pedido | todos |
| `/configuracoes` | Dados da loja, QR de mesa, alerta de pedido novo, zona de risco | todos |
| `/usuarios`, `/relatorios`, `/lojas/nova` | Usuários, relatórios, criar loja | só `super_admin` |
| `/cadastro` | Criar o primeiro `super_admin` (só funciona uma vez) | público |

"Todos" = `super_admin` (qualquer loja, pelo seletor da sidebar) e `store_admin` (só a dele).

### Regras deste app
- **Dashboard**: atualização por Realtime em `orders` + refetch a cada 30s (fallback) + banner quando o Realtime cai. Pedido novo: toast + som + notificação do navegador, cada um ligável por loja. Cards com altura fixa; CPF/telefone formatados só na exibição (banco guarda só dígitos — trigger `sanitize_order_contact_fields`).
- **Aceitar pedido** abre `AcceptOrderModal` (escolher/criar atendente) e imprime o cupom (`printOrderReceipt`, 72mm, `window.print()` na impressora padrão do Windows; impressão sem diálogo = atalho do Chrome com `--kiosk-printing`, passo a passo no histórico).
- **Finalizar** (card, detalhes, mesa e "Finalizar tudo"): se o preço Lover do pedido é menor, abre `FinalizeLoverModal` ("Cliente é Cacau Lover?", uma pergunta só pra mesa inteira); senão finaliza direto. Card/detalhes mostram "Lover R$ X" abaixo do total até a resposta (`LoverTotalHint`); o cupom imprime a linha do Lover.
- **Coluna "Entregue"** junta pedidos da mesma mesa num card só (`TableGroupCard`) com "Finalizar tudo". Fechar comanda é manual (`close_table_session`, só com todos os pedidos finalizados/cancelados).
- **Editar itens** (só em `received`): inclui variação/adicional; pedido nunca fica sem item (cancelar em vez de esvaziar).
- **Relatórios**: só pedido `finalized` conta como dinheiro, pelo preço que valeu (`calculateOrderTotal`: Lover se `is_lover`, normal senão); cancelado só entra na taxa de cancelamento; tempo de preparo vem de `order_status_history`; clientes novos x recorrentes por telefone. Exporta `.xlsx` (4 abas).
- **Produto**: categoria é entidade (`category_id`; `products.category` texto é espelho por compatibilidade, nunca editar só ele). `category_id` de outra loja é recusado por trigger. Ordem do cardápio só pela tela "Organizar cardápio".
- **Copiar catálogo** (`super_admin`): Edge Function `copy-catalog` + RPC `copy_catalog`; destino = loja ativa; estoque no destino sempre `track_stock=false`/0.
- **Usuários**: criar/editar/excluir só via Edge Functions; não dá pra desativar nem excluir outro `super_admin`, nem a si mesmo (a função `delete-admin-user` também recusa); excluir é bloqueado se o usuário já mexeu em pedido (aí desativa).
- **Invalidar cache de pedido**: sempre `invalidateOrderQueries` (cobre `['orders']` e `['order-history']`), nunca `invalidateQueries(['orders'])` cru.
- **Listagens**: paginação (10/20/50) e filtro no servidor; busca com debounce 300ms (`useDebouncedValue`). Loop de `.range()` quando precisa de tudo (o Supabase corta em 1000 linhas sem avisar).
- **Reordenar com upsert em lote**: mandar a linha inteira (upsert só com PK + `sort_order` quebra por `NOT NULL`).

### Identidade visual
- Paleta (tokens no `@theme`): `background #F0ECD2` / `foreground #030404` · `primary #CF9047` (CTA) · `secondary #7B431B` · `accent #2C120B` (superfícies escuras).
- Status usam cor funcional do Tailwind, não a de marca: `received`/`preparing` âmbar · `out_for_delivery`/`delivered` azul · `finalized` verde · `cancelled` vermelho.
- Fontes: `--font-display` **Sora** (títulos, nome de produto) · `--font-body` **Inter**. Escala de tamanho só a do Tailwind.
- Responsivo até mobile em toda tela; motion só onde explica mudança; numeração 1/2/3 só em sequência real.

### Cuidados técnicos (bugs já corrigidos — não reintroduzir)
- `Dialog` (`ui/Dialog.tsx`): centraliza com flexbox, **nunca `transform`** (quebrava o posicionamento do Combobox e fazia o scroll pular); `onEscapeKeyDown` não fecha o Dialog se houver popover aberto; modais internos usam `event.stopPropagation()` no submit e `useId()` nos campos; `Combobox` sem `Portal`.
- `ui/Label.tsx` é `block` (label inline colava no input estreito).
- `recharts` `<Pie>` com `isAnimationActive={false}` (donut sumia).
- Formulário que cria registro e depois faz um 2º passo (produto + vínculos, promoção + combo) guarda o registro criado: reenviar vira `update`, nunca duplica.

### Checklist antes de dar uma tarefa como pronta
1. Regra de negócio em `domain`/`application`, com teste unitário.
2. Mudança de banco? Migration nova + aplicada e testada no staging (ver "Banco de dados" acima).
3. `pnpm test`, `pnpm lint`, `pnpm build` limpos.
4. Visto funcionando no navegador **contra o staging** (`pnpm dev --mode staging`).
5. `security-sweep` sem CRÍTICO/ALTO.
6. Regra nova/alterada registrada neste CLAUDE.md (e no bloco compartilhado, se valer pros dois apps). Decisão/porquê relevante → `docs/historico.md`. Pendência → `docs/backlog.md`.

### Importação e exportação de planilha de produtos
Formato real recebido da loja (Excel/CSV, colunas nessa ordem):

| Coluna da planilha | Campo em `products` | Observação |
|---|---|---|
| Código | `external_code` | chave de upsert — reimportar não duplica, atualiza pelo `(store_id, external_code)` |
| Descrição | `name` | |
| Descrição detalhada | `description` | opcional. Texto livre do cardápio. **Não confundir com "Descrição"** (→ `name`). Aliases: "Descrição detalhada", "Descrição completa", "Detalhes" |
| Categoria | `category_id` + `category` (texto espelho) | opcional. Nome da categoria. **Categoria que ainda não existe na loja é criada automaticamente** (`active=true`) — comparação sem caixa. Preview lista antes quais vão ser criadas. Resolução nome→id acontece em `useProductImport.ts` (client), não no domínio (que é puro) |
| NCM | `ncm` | fiscal, guardado mas não usado em regra de negócio |
| Unidade | `unit` | UN, KG, L etc. |
| Local | — | ignorada (sempre "Loja" nas planilhas reais, sem valor informativo) |
| Estoque | `stock_quantity` | ignorado (gravado como 0) quando "Utilizará estoque" = não |
| Utilizará estoque | `track_stock` | opcional, sim/não. `não`/`n`/`0`/`false` → `track_stock=false` (e zera `stock_quantity` mesmo se a célula Estoque tiver valor). Vazia → mantém/`true` (ver regra de célula vazia abaixo). Aliases: "Utilizará estoque", "Usar estoque", "Controla estoque", "Controlar estoque" |
| Custo R$ | `cost_price` | **nunca exposto no storefront** — só leitura autenticada de `store_admin`/`super_admin` |
| Preço R$ | `price` | preço visível ao cliente |
| Lover R$ | `lover_price` | opcional. Vazia ao **criar** → `lover_price = price` (cliente lover paga o mesmo); vazia ao **atualizar** → mantém o lover atual. Aliases: "Lover R$", "Preço lover R$", "Preço lover", "Lover" |
| Cafeteria | `available_dine_in` | opcional, sim/não. Vazia → mantém/`true`. Aliases: "Cafeteria", "Consumo no local", "Salão" |
| Para levar/entrega | `available_pickup` | opcional, sim/não. Vazia → mantém/`true`. Aliases: "Para levar/entrega", "Para levar", "Retirada", "Entrega". (`available_delivery` foi aposentado da UI — ver "Tipo de cardápio no produto"; a importação não escreve essa coluna) |
| Revendedor | `available_reseller` | opcional, sim/não. Vazia → mantém/`false`. Aliases: "Revendedor", "Revenda", "Atacado" |
| Ativo | `active` | opcional, sim/não (aceita também `ativo`/`inativo`). Produto inativo não aparece no cardápio do cliente. Vazia → mantém/`true`. Aliases: "Ativo", "Ativa", "Produto ativo" |
| Custo Total R$ / Preço Total R$ | — | calculado (preço × estoque), não armazenar |
| Situação | — | ignorada — mesmo com valor "Ativo"/"Inativo" nas planilhas de ERP, **não** vira `active`; use a coluna "Ativo" |
| ORDEM | — | **removida da importação** — a ordem do cardápio agora é só pela tela "Organizar cardápio" (`products.sort_order` não é mais lido nem escrito pelo import). Coluna "ORDEM" na planilha é ignorada. |

**Célula vazia NÃO sobrescreve** (mudança pedida pelo usuário — importação não pode apagar dado preenchido à mão). Regra por camada:
- `parseProductImportRow.ts` (puro) só extrai o que está na linha — célula vazia vira `null` = "não informado" (nunca aplica default aqui).
- `resolveImportValues.ts` (puro, testado) junta a linha crua com o estado atual do produto: célula preenchida vence; **vazia + produto existe → mantém o valor atual**; vazia + produto novo → default neutro (`price=0`, `track_stock=true`, `active=true`, canais Cafeteria/Para levar `true` e Revendedor `false`, resto `null`/`0`). Não trata `sort_order` — a ordem do cardápio é só pela tela "Organizar cardápio".
- `listForImportMerge(storeId, codes)` (`SupabaseProductRepository`) traz o snapshot atual dos produtos que a planilha referencia (`.in('external_code', chunk)` em lotes de 200), indexado por código — é o que decide create vs update e alimenta o `resolveImportValues`.
- `useProductImport.ts` resolve os nomes de categoria já resolvidos (`row.resolved.categoryName`) pra id, criando as que faltam, e chama `bulkUpsertFromImport`.
- `bulkUpsertFromImport` monta o payload **a partir de `row.resolved`** (todas as colunas já com valor final — mantido ou default), incluindo `active`, e faz `upsert` com `onConflict: 'store_id,external_code'`. Como toda linha do payload tem as mesmas chaves e todo valor é real, nada é apagado sem querer. `sort_order`, `available_delivery` e `image_url` ficam de fora do payload (upsert parcial preserva — produto novo pega o default `0` de `sort_order`).

A tabela do preview mostra o **valor final resolvido** (o que vai ficar gravado), não o valor cru da planilha.

`detectCsvDelimiter` (só CSV) soma `,` vs `;` nas **primeiras 10 linhas não-vazias**, não só na 1ª — planilha real tem linha de título sem delimitador antes do cabeçalho, e olhar só a 1ª linha caía sempre em `,` (bug latente corrigido junto desta rodada, com teste).

Fluxo: upload do arquivo → parse (linha a linha) → preview numa tabela (o que vai ser criado vs. atualizado, comparando por `external_code`; lista as categorias que serão criadas) → confirmação humana → grava. Nunca gravar direto sem preview, mesmo que pareça óbvio.

**Exportar planilha** (botão ao lado de "Importar planilha", `ProductListPage.tsx`): `productRepository.listAll(storeId)` (loop de `.range()` em lotes de 1000) → `infrastructure/product/export/buildProductsWorkbook.ts` (ExcelJS, mesmo pacote do parser) monta o `.xlsx` estilizado com a paleta de marca (accent/creme/primary em ARGB), título com nome da loja nas linhas 1-2 (o parser acha o cabeçalho pela célula "Código", então título não atrapalha reimportação), cabeçalho congelado + autofilter, linhas alternadas, dinheiro com `numFmt`. Colunas idênticas às do import; `sim`/`não` pros booleanos; estoque 0 + `não` quando `track_stock=false`. `useExportProducts` (mutation em `useProducts.ts`) baixa via Blob + `<a download>` temporário (mesmo padrão de `exportReportCsv.ts`). Round-trip testado (`buildProductsWorkbook.test.ts`): exporta → `XlsxSpreadsheetParser` + `parseProductImportRow` reconstrói os campos.

**Campos que a planilha pode não trazer** (`image_url`, e `category`/`description` se as colunas novas ficarem em branco) entram nulos/vazios no produto recém-importado — a tela de produtos marca esses como "Incompleto" (badge + filtro "Só produtos incompletos") pra facilitar completar depois. Foto continua sempre manual (não tem coluna de imagem na planilha).

**Convenção de evolução de schema**: todo campo novo adicionado em `products` (ou qualquer tabela que a importação escreve) nasce **opcional ou com valor padrão**, nunca `NOT NULL` sem default. Isso garante que a importação (e qualquer outro fluxo existente) nunca quebra por causa de um campo que não sabe preencher.

**Segurança do `cost_price`**: RLS é por linha, não por coluna — então um `customer` com acesso de leitura à tabela `products` enxergaria `cost_price` junto se a query for `select *`. Solução: criar uma view `public_products` (todas as colunas de `products` exceto `cost_price` e `external_code`) e o storefront consulta essa view, nunca a tabela `products` direto. O admin continua usando a tabela completa.
