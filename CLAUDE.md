# CLAUDE.md — Painel administrativo ([Splash Pedidos])

## Pré-requisitos (instalar uma vez, antes de tudo)
- Node.js 20+ → https://nodejs.org
- pnpm → `npm install -g pnpm`
- Git

## Setup inicial — rodar só se este projeto ainda não existe (sem `package.json` nesta pasta)
Se já existe `package.json` aqui, pule direto pra "Comandos". Se não existe, siga esta ordem:

**1. Criar o projeto Vite + React + TypeScript nesta pasta:**
```bash
pnpm create vite@latest . --template react-ts --no-interactive
```
Se aparecer aviso de pasta não vazia (por causa deste `CLAUDE.md`), pode confirmar/prosseguir — o Vite não mexe em arquivos `.md`.

**2. Instalar dependências:**
```bash
pnpm install
pnpm add @supabase/supabase-js @tanstack/react-query zustand react-hook-form zod react-router-dom
pnpm add -D @tailwindcss/vite
```

**3. Configurar Tailwind CSS v4.** Em `vite.config.ts`:
```ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
})
```
Conteúdo completo de `src/index.css` (a paleta de marca já embutida como tokens):
```css
@import "tailwindcss";

@theme {
  --color-background: #F0ECD2;
  --color-foreground: #030404;

  --color-primary: #CF9047;
  --color-primary-foreground: #030404;

  --color-secondary: #7B431B;
  --color-secondary-foreground: #F0ECD2;

  --color-accent: #2C120B;
  --color-accent-foreground: #F0ECD2;
}
```

**4. Criar a estrutura de Clean Architecture:**
```bash
mkdir -p src/domain src/application src/infrastructure/supabase src/presentation
```

**5. Criar o cliente Supabase**, em `src/infrastructure/supabase/client.ts`:
```ts
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Configure VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY em .env.local')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
```

**6. Criar `.env.local` na raiz** (nunca commitar este arquivo):
```
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```
Se o projeto Supabase compartilhado ainda não existe: esse é o único passo manual do setup inteiro, feito no navegador, não por comando. Acesse https://supabase.com → **New project** → depois de provisionar, em **Project Settings → API** copie a **Project URL** e a **anon public key** pra dentro do `.env.local` acima. O repositório `storefront` vai usar exatamente os mesmos dois valores.

**7. `.gitignore` na raiz:**
```
node_modules
dist
.env.local
.DS_Store
```

**8. Primeiro commit:**
```bash
git init
git add .
git commit -m "chore: scaffold inicial do admin"
```

## Comandos (depois que o projeto já existe)
```bash
pnpm install       # instala dependências (se node_modules não existir)
pnpm dev           # inicia servidor de desenvolvimento (http://localhost:5173)
pnpm build         # build de produção
pnpm test          # testes unitários (Vitest)
pnpm test:e2e      # testes end-to-end (Playwright) — já ativo desde a Fase 1
pnpm lint          # oxlint (não ESLint)
```
Quando pedirem pra "iniciar a aplicação": sem `package.json` → siga "Setup inicial" primeiro. Com `package.json` mas sem `node_modules` → `pnpm install`. Depois, sempre `pnpm dev`.

## Sobre o projeto
[Splash Pedidos] é um SaaS de pedidos multi-loja (multi-tenant). Não é um sistema exclusivo da Kaká o Show — a Kaká o Show é a primeira cliente (3 lojas), mas o produto precisa suportar qualquer loja/cafeteria que assinar depois. Não é um MVP raso: o objetivo é um produto pronto pra produção (testes, RLS, tratamento de erro) desde o primeiro código — mesmo que o processo em volta comece simples.

Este repositório é só o **painel administrativo**. O cardápio do cliente vive num repositório separado (`storefront`). Os dois se conectam ao mesmo projeto Supabase hospedado — não existe repositório de schema, porque não existe schema duplicado.

## Repositórios do projeto
- `admin` (este repositório) — painel administrativo
- `storefront` — cardápio do cliente
- **1 banco de dados**: um único projeto Supabase hospedado (não local), compartilhado pelos dois repositórios via a mesma `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`.

## Domínio e roteamento (decisão pra Fase 2, registrada aqui pra não se perder)
Quando o domínio da empresa for comprado: **subdomínios**, não path-based sob o mesmo domínio.
- `admin.dominio.com` → este app. Um só, sem loja no path — login + RLS decidem o que cada `store_admin`/`super_admin` vê.
- `pedido.dominio.com` (ou o domínio raiz) → o `storefront`, com a loja no path (`pedido.dominio.com/cacaushow-torres`), já que a rota `/:storeSlug/...` já existe desde o design inicial.

Cada subdomínio aponta direto pro respectivo projeto Vercel, sem proxy/rewrite entre os dois — menos coisa frágil pra quebrar num time de 2 pessoas sem CI ainda.

**Passo a passo pra quando chegar na Fase 2** (precisa de um deploy vivo na Vercel primeiro — não dá pra apontar DNS pra nada antes disso):
1. No projeto Vercel do `admin`: Settings → Domains → adicionar `admin.seudominio.com`
2. A Vercel mostra um registro CNAME pra criar (geralmente `cname.vercel-dns.com`)
3. No painel do registrador do domínio (registro.br, Cloudflare etc.): criar esse CNAME
4. Repetir os passos 1–3 no projeto Vercel do `storefront`, pra `pedido.seudominio.com` (ou o domínio raiz, se preferirem)
5. Propagação de DNS leva de minutos a algumas horas; a Vercel emite o certificado SSL sozinha depois que o CNAME resolve

O domínio em si pode ser comprado a qualquer momento, sem depender desse passo — só o apontamento do CNAME que precisa esperar o primeiro deploy.

## Fases do projeto
**Fase 1 (agora):** 2 repositórios (`admin`, `storefront`), 1 projeto Supabase hospedado compartilhado entre os dois. Sem PR obrigatório, sem CI, sem staging separado. Push quando quiser sincronizar, git local o resto do tempo. Mudança de schema é feita direto no SQL Editor do Supabase Studio, por enquanto sem migration versionada — formaliza isso na Fase 2.

**Fase 2 — unificação (ao bater o Marco 1 abaixo):** os dois repositórios se juntam num monorepo (Turborepo + pnpm workspaces), as mudanças de schema passam a ser migrations versionadas (`supabase/migrations`), e entra staging (projeto Supabase separado), CI e PR obrigatório.

## Fluxo de branches e release (GitFlow simplificado — vigente desde o período de teste com clientes)
Clientes reais já usam o deploy de produção (`main` → https://painel-adm-cacau.vercel.app). A partir daqui, **nunca desenvolver direto na `main`** — isso substitui o "push quando quiser" da Fase 1.

- **`main`** — produção, o que os clientes usam. Só recebe merge de release ou hotfix. Todo push na `main` faz deploy de produção na Vercel automaticamente.
- **`dev`** — desenvolvimento contínuo, branch padrão do dia a dia. Todo push gera Preview Deployment na Vercel com URL estável própria (`painel-adm-cacau-git-dev-...vercel.app`) — é o ambiente de teste interno.
- **Feature branch** (opcional) — pra tarefa maior/arriscada, criar a partir da `dev` e mergear de volta na `dev`.

**Soltar versão pros clientes:**
```bash
git checkout main
git merge dev
git tag v1.x.y        # versionamento semântico: major.minor.patch
git push origin main --tags
git checkout dev
```

**Hotfix (bug urgente em produção):** branch a partir da `main`, corrige, merge na `main` (deploy imediato) **e** na `dev` — senão a correção se perde no próximo release.

**Cuidado que branch nenhuma resolve:** o banco Supabase é um só, compartilhado entre `dev` e produção. Mudança de schema/RLS/RPC no SQL Editor atinge os clientes na hora, independente de branch. Durante o período de teste: mudança de schema só aditiva/compatível (campo novo sempre opcional ou com default — convenção que já existe em "Importação de planilha"), nunca renomear/remover coluna ou apertar política que o código em produção ainda usa. Isolamento de banco de verdade (projeto Supabase de staging) é a Fase 2.

## Stack técnica
- React 19 + Vite, TypeScript em modo `strict`
- Tailwind CSS v4 via `@tailwindcss/vite` (sem `tailwind.config.js` — tokens ficam em CSS, bloco `@theme`, quando precisar customizar)
- TanStack Query (estado de servidor) + Zustand com `persist` (estado local de UI — seletor de loja ativa, preferência de notificação por loja, "zerar finalizados")
- React Hook Form + Zod (formulários e validação)
- **Radix UI primitives** (`react-select`, `react-checkbox`, `react-switch`, `react-dialog`, `react-dropdown-menu`, `react-label`, `react-slot`, `react-popover`) + `class-variance-authority` + `clsx`/`tailwind-merge` (`cn()`) — componentes de UI reais em `presentation/ui/`, não HTML cru estilizado
- `cmdk` (busca/combobox, ver `ui/Combobox.tsx`) + `@dnd-kit/core`/`@dnd-kit/sortable`/`@dnd-kit/utilities` (drag-and-drop pra reordenar, ver `ui/SortableList.tsx`)
- `lucide-react` (ícones) + `sonner` (toast)
- Supabase (Postgres + Auth + Realtime + Storage + Edge Functions + API automática)
- Vitest + Testing Library (unitário) e Playwright (E2E) — ver "Testes"
- Deploy: Vercel

## Paleta de cores
Tokens de marca (já embutidos no `@theme` do `src/index.css`, ver "Setup inicial"):

| Token | Hex | Uso |
|---|---|---|
| `background` / `foreground` | `#F0ECD2` / `#030404` | fundo principal / texto principal |
| `primary` / `primary-foreground` | `#CF9047` / `#030404` | botões e CTAs |
| `secondary` / `secondary-foreground` | `#7B431B` / `#F0ECD2` | ações secundárias, bordas |
| `accent` / `accent-foreground` | `#2C120B` / `#F0ECD2` | cabeçalhos, superfícies escuras, hover |

**Cores de status do pedido** (badges do kanban) usam a paleta funcional padrão do Tailwind, não a de marca — 5 tons de marrom ficam parecidos demais pra escanear rápido. Vocabulário real (ver "Fluxo de status do pedido"):
- `received` / `preparing` → âmbar (`amber-500`)
- `out_for_delivery` (colunas "Saiu pra entrega" e "Pronto para retirada") → azul (`blue-500`)
- `finalized` → verde (`green-500`)
- badge de canal (Cafeteria/Delivery/Retirar no local/Revendedor) é cor própria, separada da cor de status — ver `BADGE_COLOR` em `OrderDashboardPage.tsx`

## Padrões de frontend e identidade visual (atualizado — fonte trocada pra combo mais padrão)
Aviso honesto: creme + caramelo é um dos combos que mais grita "gerado por IA" quando não é intencional — no nosso caso é legítimo (marca real de café/cacau), mas isso só funciona se a personalidade vier da tipografia e da linguagem, não só da cor.

`--font-display` é **Sora** (Google Fonts, pesos 600/700, carregada via `<link>` no `index.html`) — trocado de Sagona/Playfair Display (fonte licenciada nunca chegou a ser adicionada, `public/fonts/` nunca existiu; Playfair Display era só o fallback que sempre renderizou de fato) pra um combo mais comum e sem dependência de arquivo de fonte próprio. Poppins foi testada antes e trocada por Sora (decisão de gosto). `--font-body` continua **Inter**.

`font-display` pra títulos e nome de produto; `font-body` pra UI, formulário e tabela. Escala de tamanho: escala padrão do Tailwind (`text-sm` até `text-3xl`) — não inventa tamanho solto fora dela.

Regras não-negociáveis, independente de feature:
- **Foco de teclado sempre visível** (nunca `outline: none` sem substituir por outro indicador claro).
- **Responsivo até mobile** em toda tela nova, mesmo as "só admin usa no desktop".
- **Motion com intenção, não decoração** — anima só onde ajuda a entender o que mudou (ex: card de pedido entrando no kanban), nunca só pra "parecer moderno". Respeitar `prefers-reduced-motion`.
- **Marcador numerado (1/2/3) só onde a sequência é real** — o acompanhamento de status do pedido é uma sequência de verdade, então numerar ali faz sentido; não force isso em conteúdo que não é sequencial.
- **Copy do lado de quem usa**: voz ativa, nomeia pelo que a pessoa reconhece, não por termo técnico do sistema. O botão que diz "Confirmar pedido" gera um toast "Pedido confirmado" — a mesma palavra do botão, nunca jargão tipo "processado com sucesso".

## Etapas de desenvolvimento
1. **Schema base** no Supabase (tabelas + RLS + trigger de `profiles`) — sem isso nada mais funciona
2. **Login/auth** funcionando + criação do primeiro `super_admin` (tela `/setup`, ver "Bootstrap de usuários")
3. **CRUD de loja e produto** — precisa existir antes de qualquer pedido fazer sentido
4. **Importação de planilha** (formato já definido)
5. **Dashboard de pedidos** + realtime + máquina de estados — só depois de ter produto cadastrado pra testar contra
6. A partir daqui o storefront já consegue testar de ponta a ponta (loja, produto e login existem)

**Varredura de segurança — obrigatória antes de dar qualquer feature como concluída:** rodar o agente `security-sweep` (definido em `.claude/agents/security-sweep.md`) passando os arquivos/telas que a feature tocou. Ele conhece o modelo de ameaças do projeto (RLS multi-tenant, `cost_price`, snapshot de preço, Edge Functions, reforço em RPC) e reporta achados com severidade e file:line — só leitura, não corrige. Achado CRÍTICO/ALTO bloqueia o "feito" até resolver.

**Checklist de revisão — rodar ao final de cada etapa acima, antes de avançar pra próxima:**
- [ ] **Clean Architecture**: a lógica de negócio dessa etapa está em `domain`/`application`, sem `import` de React ou do client Supabase ali dentro?
- [ ] **SOLID**: componente/hook novo faz uma coisa só? Alguma implementação concreta devia estar atrás de uma interface?
- [ ] **Segurança**: toda tabela nova tem RLS *testado* (não só criado)? Operação crítica tem validação no client + reforço em RPC?
- [ ] **Escalabilidade**: toda listagem nova tem paginação? Toda coluna usada em filtro tem índice?
- [ ] **Frontend**: segue a paleta/tipografia definidas? Foco de teclado visível? Copy do lado do usuário?
- [ ] **Testes**: regra de negócio nova tem teste unitário? Se é fluxo crítico, pelo menos testado manualmente de ponta a ponta.

## Multi-tenancy (isolamento entre lojas)
- Banco único, schema único. Toda tabela de domínio tem `store_id uuid not null references stores(id)`.
- **RLS obrigatório em toda tabela.** `super_admin` enxerga todas as lojas; `store_admin` só a própria.
- Nunca confie em filtro feito só no frontend — a segurança real é a política de RLS definida no projeto Supabase compartilhado.

## Modelo de dados (no projeto Supabase compartilhado — atualizado com o schema real)
```
profiles      (id, role: super_admin|store_admin|customer, store_id nullable, full_name, email)
               -- email é cópia do auth.users.email, sincronizada nas Edge Functions de
               -- criar/editar admin — existe só pra o painel poder mostrar o e-mail atual
               -- sem precisar de service role toda vez que abre o modal de editar usuário
stores        (id, name, slug, active, created_at,
               supports_dine_in boolean default true, supports_pickup boolean default true,
               supports_delivery boolean default false, reseller_enabled boolean default false)
products      (id, store_id, external_code, name, ncm, unit, category, description, image_url,
               stock_quantity, cost_price, price, lover_price, sort_order, active, track_stock, created_at,
               available_dine_in, available_pickup, available_delivery, available_reseller boolean)
               -- unique (store_id, external_code) — chave de upsert na reimportação
               -- cost_price NUNCA é exposto ao storefront (ver "Importação de planilha")
               -- canal por tipo de consumo (dine_in/pickup/delivery), não só varejo/atacado —
               -- reseller ainda é dimensão separada via order.sales_channel
orders        (id, store_id, customer_id, customer_name, customer_cpf, customer_phone,
               order_type: dine_in|pickup|delivery, status: received|preparing|out_for_delivery|finalized|cancelled,
               sales_channel: retail|reseller default 'retail',
               table_number text nullable, delivery_address jsonb nullable, created_at, updated_at)
               -- sales_channel='reseller' nunca combina com order_type='dine_in'
               -- customer_cpf/customer_phone sempre só dígitos (trigger de sanitização
               -- before insert/update — nunca confiar que quem grava já limpou)
               -- ver "Fluxo de status do pedido" pro vocabulário real de status
order_items   (id, order_id, product_id, quantity, unit_price, notes)   -- unit_price é cópia do
                                                                    -- preço no momento do pedido,
                                                                    -- nunca referencie products.price
                                                                    -- direto. notes (nullable) é
                                                                    -- observação livre do cliente
                                                                    -- pro item ("sem cebola" etc.),
                                                                    -- escrita pelo confirm_order do
                                                                    -- storefront — admin só lê
order_status_history (id, order_id, status, changed_by, changed_at)
               -- changed_by references profiles(id) sem cascade — bloqueia hard-delete de
               -- usuário que já mudou status de algum pedido (ver "Bootstrap de usuários")
addon_groups          (id, store_id, name, active, created_at)
addon_options         (id, group_id, name, price, active, created_at)
product_addon_groups  (product_id, addon_group_id, selection_type: single|multiple, max_quantity nullable, sort_order)
                      -- PK composta (product_id, addon_group_id) — é aqui que single/multiple, o
                      -- limite e a ordem de exibição (sort_order, por produto) variam por produto,
                      -- nunca no grupo/opção em si (ver "Feature: Adicionais de produto")
order_item_addons     (id, order_item_id, addon_option_id, name, price, quantity, created_at)
                      -- name/price são snapshot, nunca referenciam addon_options ao vivo
variation_groups          (id, store_id, name, active, price_mode, created_at)
variation_options         (id, group_id, name, price, active, created_at)
product_variation_groups  (product_id, variation_group_id, sort_order)
                          -- PK composta, sem coluna de config de seleção (sempre single+obrigatório) —
                          -- só sort_order (por produto, ver "Feature: Variação de produto")
order_item_variations     (id, order_item_id, variation_option_id, name, price, created_at)
                          -- name/price são snapshot; sem coluna quantity (1 escolha por dimensão)
promotions            (id, store_id, title, subtitle, badge_label, image_url, product_id, sort_order, active, created_at)
                      -- criada pelo lado do storefront (não deste repo). Sem preço próprio —
                      -- carrossel do cliente sempre lê o preço do product_id ao vivo. Sem
                      -- vigência (starts_at/ends_at) — "desativar" é só active=false.
                      -- view public_promotions (só active=true) é o que o storefront lê,
                      -- este admin sempre usa a tabela completa. Ver "Feature: Promoções".
```

## Canal de revendedor (`/atacado`)
Mesma loja, mesmo preço, cadastro livre igual cliente comum — **não é um papel novo em `profiles`**, é só uma vitrine e um fluxo diferentes dentro do mesmo app do storefront. Slug sempre derivado do slug da loja (`{slug-da-loja}/atacado`), nunca um campo separado pra configurar — se a loja não tem `reseller_enabled = true`, essa rota simplesmente não existe pra ela. Catálogo filtra por `available_reseller` em vez de `available_retail`; pedido nasce com `sales_channel = 'reseller'` e não oferece `dine_in` como tipo.
No dashboard de pedidos, o filtro por canal (varejo/atacado) é uma dimensão a mais, separada do filtro por tipo (local/retirada/delivery) já existente.

## Arquitetura limpa (Clean Architecture)
4 camadas, dependência sempre de fora pra dentro:
```
domain/           → entidades e regras de negócio puras (sem React, sem Supabase)
application/      → casos de uso (interfaces/portas + orquestração)
infrastructure/   → implementações concretas (cliente Supabase)
presentation/     → componentes React, hooks, páginas
```
Exemplo: a regra "`dine_in` pula `out_for_delivery` e vai direto de `preparing` pra `finalized`" vive em `domain/order/orderStatusRules.ts`, função pura testável sem montar componente nem mockar Supabase.

## SOLID aplicado ao frontend
- **S**: componente faz uma coisa só (busca / formata / desenha em partes separadas).
- **O**: composição em vez de `if/else` de tipo — mapa de estratégias por `order_type`.
- **L**: qualquer implementação de uma interface (ex: `OrderRepository`) é substituível, inclusive por um fake nos testes.
- **I**: hooks pequenos e específicos (`useOrderStatus`, `useOrderRealtime`) em vez de um `useOrders` gigante.
- **D**: `presentation` depende de abstrações de `application`, nunca importa o client Supabase direto num componente.

## Fluxo de status do pedido (`delivered` implementado — RPC/schema já aplicados e testados de ponta a ponta contra o Supabase real)
Valores em `orders.status`: `received | preparing | out_for_delivery | delivered | finalized | cancelled`. Sem `pending`/`ready`/`served`/`closed`/`awaiting_pickup`/`picked_up` — o fluxo usa 1 vocabulário só. `finalized` deixou de cobrir "entregue": agora significa especificamente **pagamento confirmado / pedido fechado**, depois que o cliente já recebeu (pedido da cliente Julia, separar entrega de pagamento — `delivered` é o "Entregue").

Fluxo comum: `received` → `preparing` → `out_for_delivery` → `delivered` → `finalized`.
**`dine_in` pula `out_for_delivery`**: `received` → `preparing` → `delivered` → `finalized` (mesa não "sai pra entrega" nem "fica pronta pra retirar", mas passa por "Entregue" igual — serviu a mesa). Regra vive em `domain/order/orderStatusRules.ts` (`FLOW` vs `DINE_IN_FLOW`), pura e testada.

`out_for_delivery` é **1 status só, mas 2 colunas no kanban** dependendo de `order_type`: aparece como "Saiu pra entrega" pra `delivery`/`dine_in`, e como "Pronto para retirada" pra `pickup` — nunca um valor de banco separado, só rótulo/coluna diferente (`KANBAN_COLUMNS` com `matches()` em vez de 1:1 com status). `delivered` é 1 coluna única ("Entregue"), sem esse desdobramento — o que muda por tipo é só o degrau anterior.

- **Cancelar**: só a partir de `received` (`canCancel`). **Exige motivo** (`needsReasonToCancel`, hoje sempre igual a `canCancel` — nome próprio deixa a regra fácil de achar se um dia divergir), pedido da cliente Julia, pra ficar registrado por que o pedido não seguiu (loja recusando ou cliente desistindo). `orders.cancellation_reason` (nullable) grava o texto; modal de cancelar (`CancelOrderModal.tsx`) bloqueia "Confirmar cancelamento" com o campo vazio. **Só o lado loja está implementado aqui** — cancelamento pelo cliente/usuário é decisão do `storefront` (repositório separado), que deve escrever no mesmo `orders.cancellation_reason` se/quando implementar isso, pro dado ficar no mesmo lugar não importa quem cancelou.
- **Voltar etapa**: permitido até `delivered` (`canRevert`) — depois de `finalized` não reverte mais.
- **Editar itens do pedido**: só enquanto `received` (`canEditItems`) — depois que entra em preparo, cozinha já começou. Editar item (novo ou já no pedido) inclui variação (obrigatória, se o produto tiver grupo vinculado) e adicional (opcional) — não é mais só quantidade. Ver "Editar itens: variação e adicional" abaixo.
- Toda transição valida no RPC (`change_order_status`/`revert_order_status`), nunca só no frontend.
- **"Finalizado só depois do pagamento" é orientação de uso, não travada pelo sistema** — não existe coluna de status de pagamento no schema; quem decide o momento de clicar em avançar pra `finalized` é a atendente. Travar de verdade (ex: checkbox "pagamento confirmado" obrigatório) é evolução futura, fora do escopo desse ajuste.
- **`orders.cancellation_reason` e `change_order_status(..., p_reason)` aplicados e testados de ponta a ponta** contra o Supabase real (cancelar com motivo, sem motivo — não trava de propósito —, motivo só espaço vira `null`, cancelar bloqueado fora de `received`, fluxo `delivered` completo e o pulo antigo direto pra `finalized` sem regressão). **Cuidado ao alterar `change_order_status` de novo**: `create or replace function` só substitui a função se a lista de parâmetros for idêntica — mudar a assinatura (ex: adicionar um parâmetro novo) cria uma segunda sobrecarga em vez de substituir, e chamada com menos parâmetros que o novo total vira erro de ambiguidade (`Could not choose the best candidate function`) até a versão antiga ser apagada com `drop function` explícito. Aconteceu nessa rodada — motivo pra sempre conferir com `select pg_get_functiondef(oid) from pg_proc where proname = 'change_order_status'` se sobrou mais de 1 linha depois de aplicar. **Ainda não trava se `p_reason` vier nulo** — produção (`main`) ainda cancela sem mandar motivo nenhum; travar de verdade no RPC é o próximo passo, junto do release que leva essa tela pra produção, senão quebra o botão "Cancelar" de quem ainda roda o frontend antigo.
- **RPC/schema aplicados no SQL Editor do Supabase** (`change_order_status`/`revert_order_status` reescritos, constraint de `orders.status` ampliada) — **retrocompatível de propósito**: continua aceitando as transições antigas direto pra `finalized` (`out_for_delivery`→`finalized`, e `preparing`→`finalized` no dine_in), porque o banco é compartilhado e a produção (`main`) ainda roda o frontend anterior até o próximo release. Testado ponta a ponta contra o banco real (avançar/reverter em cada combinação de tipo de pedido, pulo inválido bloqueado, revert depois de `finalized` bloqueado, e as duas transições antigas confirmadas ainda funcionando). De brinde, a limpeza dessa rodada removeu uma sobrecarga (`overload`) de 2 parâmetros de `change_order_status` que existia solta no banco e pulava a exigência de atendente pra quem chamasse a RPC direto pela API, fora do app — nunca era usada pelo client, mas ficava disponível pra quem tivesse o JWT.

## Papéis dentro deste app
- **`super_admin`**: vê e gerencia todas as lojas.
- **`store_admin`**: só a própria loja. Papel genérico por enquanto — granularidade extra (atendente vs. gerente) vira tabela de permissões depois, não reescrita.

## Telas principais
1. **Dashboard de pedidos** — tempo real via Supabase Realtime, kanban por coluna (`matches()`, não 1:1 com status — ver "Fluxo de status do pedido"). Pedido novo: toast + som + notificação nativa do navegador, cada um com toggle **por loja** em Configurações (`useNotificationSettings`, zustand persist keyed por `store_id`). Cards com altura fixa (nunca oscila com quantidade de dado), CPF/telefone formatados só na exibição (banco sempre limpo).
2. **Produtos e estoque** — CRUD em modal (não página cheia), estoque por loja, canal por tipo de consumo + revendedor, upload de foto, paginação configurável (10/20/50 por página, footer com "Linhas por página" + range + `‹ ›`).
3. **Gestão de lojas** — dados da loja (nome, slug, canais) movidos pra dentro de **Configurações**, não é mais tela separada. Criar loja nova é ação rara: "+ Criar loja" fixo no seletor de loja da sidebar, `super_admin` only. Zona de risco (ativar/desativar loja, excluir loja se não tiver produto/pedido/usuário vinculado) fica no fim de Configurações.
4. **Importação de planilha** — clicar "Importar planilha" já abre o seletor de arquivo do SO direto (sem tela intermediária pra escolher arquivo); depois de escolhido, cai direto no preview. Preview sempre antes de gravar.
5. **Configurações** — Dados da loja → Alerta de pedido novo (som/notificação) → Zona de risco, nessa ordem. Só mostra dado da loja ativa (seletor da sidebar pra `super_admin`, fixo na própria loja pra `store_admin`).
6. **Promoções** (`/promotions`, `store_admin` e `super_admin`, ao lado de Produtos no sidebar) — CRUD do carrossel de promoções do cardápio do cliente (repo `storefront`, mesmo Supabase compartilhado). Ver "Feature: Promoções" mais abaixo.
7. **Usuários** (`/admins`, só `super_admin`) — lista com avatar-iniciais, `super_admin` sempre primeiro na ordenação. Criar e editar são modais, não páginas. **Papel e loja só se definem na criação — nunca mudam depois** (edição só mexe em nome/e-mail/senha/ativo). Não é possível desativar outro `super_admin` nem a si mesmo. Excluir usuário existe (só `super_admin`, bloqueado se o usuário tiver pedido vinculado — ver "Bootstrap de usuários").
8. **Relatórios** (`/reports`, só `super_admin`, último item do sidebar) — filtro de período fixo (Hoje/7 dias/30 dias, sem calendário custom por enquanto). Redesenhado com gráficos (recharts) — v2, ver "Feature: Redesign de Relatórios com gráficos" logo abaixo. Sem tabela nova — calcula em cima de `orders`/`order_items`/`order_status_history` já existentes:
   - `application/order/OrderRepository.ts`: `OrderListParams` ganhou `since?: string` opcional (Dashboard continua sem passar, cai no default "hoje"; Relatórios passa a data calculada pro período escolhido).
   - `domain/order/orderPricing.ts` (`calculateOrderTotal`) e `domain/order/orderStatusRules.ts` (`orderChannelLabel`) foram extraídos do que já existia inline em `OrderDashboardPage.tsx`, pra Relatórios reaproveitar a **mesma fórmula de preço e mesma classificação de canal** do Dashboard — nunca duplicar essas regras.
   - `domain/report/calculateReportSummary.ts` — função pura, testada, recebe `Order[]` já filtrado por período e devolve o resumo. Cancelado nunca conta em nenhuma métrica (só em `cancelledCount`, pra taxa de cancelamento). **Dinheiro (`totalRevenue`/`averageTicket`, e `revenue`/`averageTicket` por canal e por atendente) só considera pedido `finalized`** — desde que `finalized` passou a significar "pagamento confirmado" (ver "Fluxo de status do pedido"), `delivered` e as etapas anteriores não são receita ainda, mesmo já aparecendo em `orderCount`/ranking de quantidade. `calculateRevenueSeries.ts` (gráfico "Faturamento ao longo do tempo") segue o mesmo critério.
   - **Ranking de atendente** — `attendantRanking: AttendantRanking[]` em `ReportSummary`, agrupado por `order.attendantId` (pedido ainda em `received`, sem atendente vinculado, não conta), ordenado por quantidade de pedido preparado decrescente, com faturamento junto. Mesmo padrão de `channelBreakdown`/`topProducts`, sem slice (lojas têm poucos atendentes).

## Feature: Redesign de Relatórios com gráficos (implementada)
Pedido do usuário via mockup próprio (Claude design) pra deixar a tela mais visual. Vários itens do mockup original não existiam no sistema (meta de faturamento, avaliação média, badge de comparação vs período anterior) — cortados do escopo por decisão do usuário, não implementados. Botão "Exportar" virou CSV simples.

**Novo na tela:**
- 5 KPIs: Faturamento, Ticket médio, Canal mais usado, **Taxa de cancelamento** (nova), **Tempo médio de preparo** (nova).
- 4 gráficos (recharts, instalado nesta feature): área "Faturamento ao longo do tempo" (bucket por hora se período=Hoje, por dia se 7d/30d), donut "Canais de venda", barras "Pedidos por horário" (0-23h, barra do pico em cor de destaque), barras horizontais "Ticket médio por canal".
- Ranking de produtos (já existia) + Ranking de atendente ganhando **faturamento** junto (antes só contagem), com avatar-iniciais (`ui/initials.ts`, mesmo padrão de Usuários).
- Card **"Clientes novos vs. recorrentes"** (novo).
- Botão **Exportar CSV** — monta o CSV no client (sem endpoint novo), baixa via Blob + link temporário.
- Tabs Hoje/7dias/30dias continuam sendo o toggle de sempre, só reestilizado — **não instalei `@radix-ui/react-tabs`**, o toggle já fazia o mesmo trabalho, dependência nova seria redundante.

**Regras de negócio novas:**
- **Taxa de cancelamento** = `cancelledCount / (orderCount + cancelledCount)`. Único lugar do sistema que considera pedido cancelado numa métrica de Relatórios.
- **Tempo médio de preparo** = média, em minutos, do tempo entre entrar em `preparing` e a próxima transição de status (`out_for_delivery`, `finalized`, o que vier primeiro), lido de `order_status_history` (tabela existe desde a feature Atendente, nunca lida pelo admin até agora). Pedido que ainda está em `preparing` (sem transição seguinte) não conta — tempo incompleto.
- **Clientes novos vs. recorrentes** — agrupado por `customer_phone` (identificador mais confiável; login é opcional no storefront, `customer_id` fica null pra quem não loga). Recorrente = telefone já tinha pedido **antes do início do período filtrado** (não é janela fixa de dias). Conta por cliente único, não por pedido. Pedido sem telefone ou cancelado não entra na conta.

**Camadas:**
```
domain/report/calculatePrepTime.ts          -- calculateAveragePrepTimeMinutes(entries), puro, testado
domain/report/calculateNewVsReturning.ts    -- calculateNewVsReturning(orders, precedingPhones), puro, testado
domain/report/calculateRevenueSeries.ts     -- calculateRevenueSeries(orders, 'hour'|'day'), bucket em horário local (nunca UTC — mesmo motivo de startOfTodayIso), puro, testado
domain/report/calculateOrdersByHour.ts      -- calculateOrdersByHour(orders), sempre 24h mesmo com 0 pedido (eixo do gráfico fica contínuo), puro, testado
domain/report/calculateReportSummary.ts     -- ganhou cancelledCount; channelBreakdown/attendantRanking ganharam revenue/averageTicket
application/order/OrderRepository.ts        -- listStatusHistory(orderIds) e listPrecedingCustomerPhones(storeId, beforeIso), ambos leves (sem join de item)
infrastructure/order/SupabaseOrderRepository.ts -- implementação dos 2 métodos acima
presentation/report/useReportSummary.ts     -- orquestra as 3 queries (orders, status history, preceding phones) e chama as funções de domínio
presentation/report/exportReportCsv.ts      -- monta e baixa o CSV (BOM UTF-8 pra Excel abrir acento certo)
presentation/report/ReportsPage.tsx         -- página inteira redesenhada com os gráficos
```

**Cuidado (bug real encontrado e corrigido, não reintroduzir)**: `recharts` 3.10.1 — `<Pie>` com animação ativa (`isAnimationActive` default `true`) renderizava o `<g class="recharts-shape">` de cada fatia **vazio** (sem `<path>` nenhum dentro, donut invisível mas sem erro no console) em teste real de navegador. `<Area>`/`<Bar>` no mesmo arquivo, mesma versão, renderizaram normal com animação ativa — bug específico do `Pie`. Fix: `isAnimationActive={false}` no `<Pie>`. Descoberto só testando com Playwright contra a tela renderizada de verdade — screenshot sozinho já teria mostrado o problema, mas o "porquê" só apareceu inspecionando o HTML interno do SVG.

**Design system**: `presentation/ui/` — componentes Radix (`Button`, `Input`, `Select`, `Checkbox`, `Switch`, `Dialog`, `DropdownMenu`, `ConfirmModal`, `Label`) estilizados com a paleta de marca, substituindo elementos nativos (`<select>`, `<input type=checkbox>` cru) em todo o app. `cn.ts` (clsx+tailwind-merge) e `initials.ts`/`styles.ts` (utilitários de apresentação) ficam na mesma pasta — mesmo padrão do shadcn/ui.

## Regras de negócio específicas
- UI só oferece transições de status válidas pro status/tipo atual.
- Toda mudança de status grava em `order_status_history` (quem, quando) — auditoria barata agora, cara depois.
- Cancelamento só em `received` (ver "Fluxo de status do pedido").

## Importação de planilha de estoque
Formato real recebido da loja (Excel/CSV, colunas nessa ordem):

| Coluna da planilha | Campo em `products` | Observação |
|---|---|---|
| Código | `external_code` | chave de upsert — reimportar não duplica, atualiza pelo `(store_id, external_code)` |
| Descrição | `name` | |
| NCM | `ncm` | fiscal, guardado mas não usado em regra de negócio |
| Unidade | `unit` | UN, KG, L etc. |
| Local | — | ignorada (sempre "Loja" nas planilhas reais, sem valor informativo) |
| Estoque | `stock_quantity` | |
| Custo R$ | `cost_price` | **nunca exposto no storefront** — só leitura autenticada de `store_admin`/`super_admin` |
| Preço R$ | `price` | preço visível ao cliente |
| Custo Total R$ / Preço Total R$ | — | calculado (preço × estoque), não armazenar |
| Situação | — | ignorada (campo solto, sem uso real) |
| ORDEM | `sort_order` | ordem de exibição no cardápio |

Fluxo: upload do arquivo → parse (linha a linha) → preview numa tabela (o que vai ser criado vs. atualizado, comparando por `external_code`) → confirmação humana → grava. Nunca gravar direto sem preview, mesmo que pareça óbvio.

**Campos que não existem na planilha** (`category`, `description`, `image_url`) entram nulos/vazios no produto recém-importado — isso é esperado, a planilha da loja nunca teve esse dado. A tela de produtos deve deixar claro visualmente quais produtos estão "incompletos" (sem categoria e/ou sem foto), pra facilitar o trabalho manual de completar depois do import — sugestão: um filtro/badge "produtos incompletos" na listagem. Como o storefront navega por categoria, vale ter esse passo de categorização feito **antes** de abrir a loja pro cliente final, não é automático.

**Convenção de evolução de schema**: todo campo novo adicionado em `products` (ou qualquer tabela que a importação escreve) nasce **opcional ou com valor padrão**, nunca `NOT NULL` sem default. Isso garante que a importação (e qualquer outro fluxo existente) nunca quebra por causa de um campo que não sabe preencher.

**Segurança do `cost_price`**: RLS é por linha, não por coluna — então um `customer` com acesso de leitura à tabela `products` enxergaria `cost_price` junto se a query for `select *`. Solução: criar uma view `public_products` (todas as colunas de `products` exceto `cost_price` e `external_code`) e o storefront consulta essa view, nunca a tabela `products` direto. O admin continua usando a tabela completa.

## Bootstrap de usuários
`profiles` não se popula sozinho — precisa de um trigger no Postgres que roda toda vez que alguém se cadastra via Supabase Auth:
```sql
create function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, role, full_name)
  values (new.id, 'customer', new.raw_user_meta_data->>'full_name');
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
```
Todo cadastro nasce `customer` por padrão (é o único cadastro público, feito pelo storefront).

**Primeiro `super_admin`** (só funciona 1 vez, depois bloqueia sozinho): tela `/setup` chama a Edge Function `setup-first-admin` — `security definer`, checa se já existe algum `super_admin` antes de criar, senão recusa. Não precisa mais de `update` manual via SQL.

**Demais admins/colaboradores**: existe tela de verdade (`/admins`, só `super_admin` acessa). Criar/editar/desativar usuário passa por Edge Functions com service role, nunca client direto em `auth.users`:
- `create-admin-user` — cria auth user + profile (papel e loja definidos só aqui, nunca mudam depois)
- `update-admin-user` — só nome/e-mail/senha (papel e loja são fixos após a criação)
- Ativar/desativar é `update` comum em `profiles.active` (RLS já cobre)
- `delete-admin-user` — exclusão definitiva existe (`/admins`, ícone lixeira + confirmação), mas **bloqueada se o usuário tiver pedido vinculado**: `order_status_history.changed_by` tem FK sem cascade pra `profiles`, então a function tenta apagar `profiles` primeiro, detecta erro `23503` (FK violation) e devolve "Usuário já tem pedido vinculado — desative em vez de excluir" sem chegar a mexer no `auth.users` (evita estado inconsistente). Mesma convenção de `AttendantInUseError`/`ProductInUseError`. Usar "desativar" continua sendo o caminho pra esse caso, mas não é mais a única opção — só quando tem histórico vinculado.

Todas essas Edge Functions seguem o mesmo padrão de segurança: verificam quem chamou (client com o JWT do caller, sem privilégio) antes de usar um client com `service_role` pra agir — nunca confiar em role vindo do body da requisição.

## Feature: Histórico de pedidos (implementada)
Resolve o ponto em aberto de "onde exibir pedido cancelado pro admin" (motivo de cancelamento documentado em "Fluxo de status do pedido") com algo mais amplo do que só cancelados: **tela nova que lista todo pedido, em qualquer status**, pedido direto da cliente Julia ("vamos fazer uma tela de histórico onde pode ver todos os pedidos em lista"). Sem tabela nova — mesma `orders`/RLS que o Dashboard já usa, só uma query diferente (paginada, sem agrupar em kanban).

**Por que não é só o kanban com cancelado incluso**: o kanban existe pra guiar o trabalho de hoje (o que fazer agora); Histórico existe pra *consultar* o que já aconteceu (inclusive coisa que não precisa mais de ação, como cancelado e finalizado antigo). Misturar as duas coisas na mesma tela pioraria as duas.

**Camadas:**
```
domain/order/orderPeriod.ts            -- OrderPeriod ('today'|'7d'|'30d') + sinceIsoForPeriod, extraído de useReportSummary.ts (Relatórios reusa, não duplica)
domain/order/orderPeriod.test.ts       -- puro, testado
application/order/OrderRepository.ts   -- OrderHistoryParams/OrderHistoryResult + listHistory(params), método novo (não mexeu no list() existente do Dashboard)
infrastructure/order/SupabaseOrderRepository.ts -- listHistory: paginado (.range), filtro opcional de status, mais recente primeiro; ORDER_SELECT virou constante compartilhada com list() (evita duplicar a string de select)
presentation/order/useOrderHistory.ts  -- HistoryPeriod = OrderPeriod | 'all' ("Tudo" só existe aqui — Relatórios não ganhou essa opção, período fechado é intencional lá)
presentation/order/OrderHistoryPage.tsx -- rota /historico: toggle de período (Hoje/7dias/30dias/Tudo, mesmo estilo do toggle de Relatórios) + filtro de status (Select) + tabela paginada (10/20/50, mesmo footer de Produtos) + coluna "Motivo do cancelamento" (só preenchida pra pedido cancelado) + botão Detalhes reaproveitando OrderDetailsDrawer sem alteração de lógica (nextStatus/canRevert/canEditItems já retornam null/false pra status terminal, então nenhum botão de ação indevido aparece pra pedido cancelado/finalizado — só confirmado, não precisou mudar)
```
`OrderDetailsDrawer.tsx` ganhou um bloco "Motivo: ..." na linha do tempo, visível só quando `status === 'cancelled'` — primeira vez que esse dado aparece em algum lugar da UI.

Entrada na UI: link "Histórico" na sidebar (visível a `store_admin` e `super_admin`, logo abaixo de Dashboard — não é restrito a `super_admin` como Relatórios/Usuários, porque quem mais precisa consultar o motivo no dia a dia é a própria loja).

**Sem SQL novo** — RLS de `orders` já cobre (`store_admin` só a própria loja, `super_admin` tudo), mesma política que Dashboard/Relatórios usam.

## Pontos a definir (pedidos da cliente Julia, período de teste)
Decisão de produto pendente, não é bug — registrado aqui pra não se perder entre conversas.

- Nenhum no momento.

## Marco 1 — o que precisa estar pronto antes da Fase 2
**Batido.** Todos os itens abaixo já implementados e validados nesta sessão — próximo passo natural é a Fase 2 (ver "Fases do projeto"), mas decisão é do time, não automática.
- [x] Login (`store_admin`/`super_admin`) via Supabase Auth
- [x] RLS validado na prática — 2 contas `store_admin` de lojas diferentes, tentativa de query cross-tenant explícita confirmada bloqueada (não só ausência de bug, teste ativo)
- [x] CRUD de produto + estoque por loja, com toggle de canal (por tipo de consumo: `dine_in`/`pickup`/`delivery`, mais `reseller` como dimensão separada)
- [x] Configuração de modos suportados pela loja — tela de Configurações, editável por `store_admin` da própria loja ou `super_admin` via seletor
- [x] Dashboard de pedidos em tempo real com a máquina de estados completa (incluindo o desvio de `dine_in`)
- [x] Importação de planilha de estoque — fluxo direto (clica "Importar planilha" → já abre seletor de arquivo do SO, sem passo intermediário) → preview → confirmação
- [x] Testes E2E (Playwright, fluxo login → avançar status → reflete no kanban) + testes unitários de `domain`/`application` (Vitest, `orderStatusRules`, schemas Zod, etc.)

## Varredura de auditoria pré-Fase 2 (implementada)
Antes de bater o Marco 1 oficialmente, rodada de auditoria dedicada (agente separado) cobrindo Clean Architecture, SOLID, segurança, escalabilidade, renderização e excesso de requests em todo o repo. 16 achados, corrigidos um por um (com teste ao vivo a cada um antes de avançar pro próximo) — nenhum exigiu mudança de schema/RPC.

**Segurança:**
- `AdminUserRepository.update`/`SupabaseAdminUserRepository` só aceitam `{ active }` — já que "papel e loja só se definem na criação" era regra só de UI, não reforçada no tipo do client; agora o client nem consegue montar um payload com `role`/`storeId`.
- `exportReportCsv.ts`: célula de CSV que começa com `=`/`+`/`-`/`@` (nome de produto/canal/atendente é texto livre) ganha prefixo `'` antes de aspas — neutraliza formula injection no Excel/Sheets.

**Correção/robustez:**
- `OrderItemsEditModal`: editar quantidade de item já existente agora valida `>= 1` também fora do modo de edição de seleção (`onBlur` da quantidade chama `updateItem` direto); antes só validava dentro do fluxo de editar seleção.
- `OrderCard`/`OrderDetailsDrawer`: avançar/voltar etapa e cancelar pedido ganharam `onError` com toast — antes uma falha de rede nessas 3 ações falhava silenciosa (sem toast, sem reversão visual).
- `ProductModal`: criar produto, vínculo de adicional/variação falhar depois, reenviar não duplicava mais `external_code` — modal rastreia o produto já criado (`createdProduct`) e reenvio vira `update`, nunca `create` de novo.
- `EditAdminProfileModal`: as 2 mutations (perfil, depois `active`) viraram 2 try/catch separados — se a 1ª tiver sucesso e a 2ª falhar, mensagem agora diz "nome/e-mail/senha salvos, mas falha ao mudar status", não erro genérico.
- `ItemSelectionFields`: enquanto `useProductVariationGroupList`/`useProductAddonGroupList` ainda não resolveram (`undefined`), tratava como "sem grupo obrigatório" (válido) — liberava "Adicionar item" antes da hora. Agora `isLoadingGroups` bloqueia isso.
- `linkGroupToProduct` (adicional e variação): calculava "próximo sort_order" em 2 leituras sequenciais (corrida entre 2 vínculos concorrentes podia empatar sort_order); virou 1 leitura só. `listProductAddonGroups`/`listProductVariationGroups` ganharam desempate estável (`.order('sort_order').order(id do grupo)`) pro caso de empate não deixar a ordem instável entre reloads.

**Escalabilidade:**
- `useStores.ts` ganhou `useAllStores()` — percorre todas as páginas de verdade (loop por `total`, sem cap arbitrário); `StoreSwitcher`/`AdminUserListPage` trocaram `useStoreList(0)` (truncava em 20 lojas) por ele.
- Relatórios: `listStatusHistory` agora filtra no banco via join (`order_status_history` → `orders!inner`), nunca mais por lista de IDs no `.in()` (risco de URL gigante em período de 30 dias com muito pedido). `listPrecedingCustomerPhones` ficou escopado aos telefones do período atual, não mais todo histórico da loja (não cresce com idade da loja).
- Reorder de adicional/variação/promoção: N `update` paralelos viraram 1 `upsert` em lote. Descoberta: upsert parcial (só PK + `sort_order`) quebra com violação de NOT NULL no `ON CONFLICT DO UPDATE` — Postgres valida a tupla completa antes de resolver o conflito (confirmado testando direto contra o banco). Fix: busca a linha inteira antes (adicional/promoção) ou usa payload já completo (variação, só 3 colunas).
- Busca de produto (item de pedido e produto vinculado de promoção) trocou `list({ pageSize: 1000 })` + filtro client por `ProductRepository.searchActive(storeId, query)` — `ilike` + `limit(20)` no servidor, com debounce (`useDebouncedValue`, novo em `ui/`). `Combobox` ganhou `onQueryChange` opcional pra suportar busca server-side sem quebrar o modo client-filter já usado em adicional/variação.

**Outros:**
- `ProductListPage`: `isProductIncomplete` (existia, testado, nunca chamado) agora vira badge "Incompleto" por linha + checkbox "Só produtos incompletos" (filtro server-side via `.or('category.is.null,image_url.is.null')`).
- `XlsxSpreadsheetParser`: planilha sem coluna "Código" lança erro explícito em vez de devolver `[]` silencioso (preview vazio enganava, parecia planilha vazia).
- Input de busca do `Combobox` tinha `outline-none` sem substituto — ganhou o mesmo `focus-visible:ring-2 ring-primary/40` do resto do app.
- "Cacau Show" hardcoded no `LoginPage` → "Splash Pedidos" (produto é multi-tenant, não é exclusivo da Kaká o Show).

## Exemplo de organização por feature (`orders`)
```
src/
  domain/order/Order.ts
  application/order/OrderRepository.ts
  application/order/changeOrderStatus.ts
  infrastructure/order/SupabaseOrderRepository.ts
  presentation/order/OrderDashboard.tsx
  presentation/order/OrderCard.tsx
  presentation/order/useOrderRealtime.ts
```

## Feature: Adicionais de produto (passos 1–5 implementados neste repo, passo 6 pendente no storefront)
Extras opcionais vinculados a produto (ex: fondue → "mais frutas", waffle → "chocolate branco extra"), cada um com preço próprio, escolhido pelo cliente no storefront e refletido no pedido. Escopo definido e aprovado pelo usuário, implementação seguiu por etapas aprovadas individualmente.

**Regras de negócio (decididas):**
- Adicional vive em **grupo reutilizável** (`addon_groups`), não por produto individual — ex: grupo "Adicionais Waffle" serve tanto "Waffle Normal" quanto "Waffle de Banana".
- Único-escolha vs múltipla-escolha e limite de quantidade **variam por produto**, não pelo grupo — o mesmo grupo pode ser single-select num produto e multi-select noutro. Essa configuração mora no vínculo produto↔grupo, nunca no grupo/opção em si.
- **Sempre opcional** — nenhum produto exige adicional. Não existe conceito de "obrigatório" no modelo.
- Preço do adicional **trava no momento do pedido** (snapshot), mesmo princípio já usado em `order_items` pro preço do produto — mudar preço do adicional depois não altera pedido já feito.

**Schema (criado, ver "Modelo de dados"):**
```
addon_groups         (id, store_id, name, active)
addon_options         (id, group_id, name, price, active)
product_addon_groups (product_id, addon_group_id, selection_type: single|multiple, max_quantity nullable, sort_order)
                      -- é aqui que a configuração "depende do produto" vive, incl. ordem de exibição
order_item_addons     (id, order_item_id, addon_option_id, name, price, quantity)
                      -- name/price são snapshot, nunca referenciam addon_options ao vivo
```
RLS por `store_id` igual toda tabela de domínio (`addon_groups`/`addon_options` via `store_id` direto; `product_addon_groups`/`order_item_addons` via join até a loja). Índice em `(store_id)` nas tabelas base e `(product_id)`/`(order_item_id)` nas tabelas de vínculo, mesma convenção de "Escalabilidade".

**Camadas (Clean Architecture) — implementado:**
```
domain/product/Addon.ts                              -- entidades AddonGroup, AddonOption, ProductAddonGroup
domain/product/addonPricing.ts                        -- calculateItemTotal/isValidAddonSelection, puro, testado
application/product/AddonRepository.ts                -- interface (porta)
application/product/addonSchema.ts                    -- Zod (addonGroupSchema/addonOptionSchema)
infrastructure/product/SupabaseAddonRepository.ts      -- implementação Supabase da porta acima
presentation/product/addons/useAddons.ts               -- hooks React Query (groups/options/vínculo produto)
presentation/product/addons/AddonGroupModal.tsx        -- CRUD de grupo (modal)
presentation/product/addons/AddonOptionModal.tsx       -- CRUD de opção dentro de um grupo (modal)
presentation/product/addons/AddonOptionsPanel.tsx      -- painel de opções de um grupo expandido
presentation/product/addons/AddonGroupListPage.tsx     -- rota /products/addons, tabela de grupos expansível
presentation/product/addons/ProductAddonGroupsSection.tsx -- seção dentro do ProductModal pra vincular grupo(s) ao produto — 2 modos (ver abaixo)
```
Entrada na UI: botão "Adicionais" em `/products` (`ProductListPage.tsx`) abre `/products/addons`. Dentro do `ProductModal`, a seção tem 2 modos via prop `mode`:
- `mode="linked"` (editando produto existente, tem `product.id`): toggle persiste na hora (`linkGroup.mutate`/`unlinkGroup.mutate`), igual sempre foi.
- `mode="draft"` (criando produto novo, ainda sem id): toggle só guarda a seleção em estado local no `ProductModal` (`draftAddonLinks`) — o vínculo real (`linkGroupToProduct`) só é gravado depois que o produto é criado com sucesso, no mesmo clique de "Salvar" do formulário principal. Não existe mais o aviso "salve o produto primeiro" — dá pra vincular adicional/variação já na criação.

Cada seção também tem botão **"+ Novo grupo"** que abre `AddonGroupModal`/`VariationGroupModal` sem sair do `ProductModal` (funciona nos 2 modos, já que criar um *grupo* não depende de `product.id`, só o *vínculo* depende). Grupo recém-criado já nasce vinculado automaticamente e expandido, mostrando o painel de opções (`AddonOptionsPanel`/`VariationOptionsPanel`) na hora — dá pra cadastrar a primeira opção sem sair do modal de produto.

Vincular grupo existente não é mais uma lista de checkbox com todos os grupos da loja — é uma **busca** (`presentation/ui/Combobox.tsx`, baseado em `cmdk` + `@radix-ui/react-popover`) que só mostra grupos ativos ainda não vinculados a esse produto; selecionar um vincula na hora (ou no draft). Os grupos já vinculados aparecem numa lista **arrastável** (`presentation/ui/SortableList.tsx`, baseado em `@dnd-kit`) — a ordem de arrastar vira `sort_order` na tabela de vínculo (`product_addon_groups`/`product_variation_groups`), **por produto**, não por grupo (2 produtos podem ordenar os mesmos grupos diferente). `linkGroupToProduct` (infra) calcula automaticamente o próximo `sort_order` (`max + 1`) ao vincular pela primeira vez; método `reorderProductAddonGroups`/`reorderProductVariationGroups` grava a lista inteira reordenada de uma vez após o drag.

**Cuidado (bugs reais já corrigidos, não reintroduzir)**: como agora existe `Dialog`/`Popover` aberto por cima de outro `Dialog` (produto), 3 problemas de nesting apareceram:
1. Radix `Dialog` usa `Portal`, então o `<form>` interno fica em outro lugar do DOM, mas o evento de `submit` ainda borbulha pela **árvore React** (não pela árvore DOM) até o `<form>` externo. Sem `event.stopPropagation()` no `onSubmit` de cada modal pequeno (`AddonGroupModal`/`AddonOptionModal`/`VariationGroupModal`/`VariationOptionModal`), submeter o modal interno também submetia o formulário do produto inteiro.
2. Campos com `id` fixo (`id="name"`, `id="price"`) colidiam entre o `ProductModal` (campos "Descrição"/"Valor não lover") e os modais internos (campos "Nome"/"Preço") quando abertos ao mesmo tempo — 2 elementos com mesmo `id` no DOM, foco/valor bugava. Fix: `ProductModal` usa ids próprios (`product-name`/`product-price`); os 4 modais pequenos usam `useId()` do React em vez de string fixa, pra nunca colidir mesmo se 2 desses modais abrirem simultâneos (ex: "+Novo grupo" em Variação e em Adicionais sem fechar o primeiro).
3. `Combobox.tsx` usava `PopoverPrimitive.Portal` — o dropdown de busca ficava com `pointer-events` bloqueado (clique caía no conteúdo do `Dialog` por baixo, mesmo com `z-index` maior), porque o portal do Popover vira irmão do portal do Dialog em `document.body`, fora da subárvore que o Dialog considera "de dentro". Fix: **tirar o `Portal`** do `Popover.Content` — ele renderiza como descendente real do `Dialog`, sem conflito de stacking. Efeito colateral aceito: o dropdown pode ficar sujeito ao `overflow-y-auto` do modal (não testado em telas muito pequenas), troca válida por já que sem isso o campo de busca não era clicável.
4. **Esc com o Combobox aberto fechava o `Dialog` de produto inteiro junto** (reportado pela cliente: "clico em Adicional achando que era Variação, os botões somem, só volto saindo da tela") — perdia todo o formulário preenchido sem aviso. Causa: o `DismissableLayer` do Radix (usado por `Dialog` e `Popover`) fecha **os dois juntos numa única execução síncrona** quando o Popover não é portaled (item 3 acima) — confirmado via instrumentação direta do DOM, não só leitura de código; tentativas de corrigir só pelo lado do `Combobox` (`onEscapeKeyDown`, `onOpenChange`, refocar o trigger antes de fechar) não funcionaram, e devolver o `Portal` reproduzia de volta o bug do item 3. Fix que funcionou: `ui/Dialog.tsx` (`DialogContent`/`DialogSideContent`) ganhou `onEscapeKeyDown` central que checa `document.querySelector('[data-radix-popper-content-wrapper]')` (atributo que todo Popper do Radix usa, Popover/Select/DropdownMenu) e cancela o fechamento do Dialog se algum popover/select estiver aberto no momento — cobre o app inteiro, não só produto. Efeito colateral aceito: como os dois fecham pelo mesmo evento nativo, `preventDefault()` no Dialog também impede o Popover de fechar sozinho nesse instante (Esc não faz nada com a busca aberta, em vez de fechar só a busca) — troca válida, o normal antes era perder o formulário inteiro. Clicar fora ou selecionar uma opção continuam fechando o Combobox normal. **Confirmado que é bug separado do item 5 abaixo** — testado desligando esse guard depois de aplicar o fix do item 5: o Esc voltava a fechar Dialog+Popover juntos mesmo sem `transform` no ancestral, então os dois fixes são independentes, precisa dos dois.
5. **Abrir o Combobox (clicar só no campo de busca, sem digitar nada) fazia o conteúdo rolável do `Dialog` pular pro topo sozinho** (reportado pela cliente: "clico no modal pra adicionar variação/adicional já feito e ele sobe pro topo"), perdendo a posição de scroll — reproduzido com o mouse.wheel simulando `scrollTop = 800` antes de clicar, confirmado que caía pra `0` exatamente no clique. Causa raiz (CSS, não Radix): `DialogContent` centralizava com `fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2` — um ancestral com `transform` vira **containing block** de qualquer descendente com `position: fixed` (regra do CSS), e o Popper do Radix (`Combobox`/`Select`/`DropdownMenu`) usa `position: fixed` pra se posicionar. Com o `Dialog` como containing block em vez do viewport real, o cálculo de posição do Popper ficava relativo ao container com scroll, e o navegador tentava "corrigir" isso rolando o container — errado. **Tentativas que não resolveram**: `onOpenAutoFocus` do Radix (o foco nem saía do botão de gatilho, confirmado via `document.activeElement`, então não era foco), monkey-patch no setter de `scrollTop` (o reset acontece nativo via engine do browser, nunca passa pelo setter JS). Devolver o `Portal` no Popover também "resolvia" (containing block volta a ser o body), mas quebrava outras coisas de verdade (digitação caindo em campo errado do formulário, confirmado em teste) — não é caminho viável. Fix real: `DialogContent` trocou a centralização por **flexbox numa `div` wrapper** (`fixed inset-0 flex items-center justify-center`) em vez de `transform` no próprio conteúdo — sem `transform` em nenhum ancestral, o Popper volta a se posicionar certo relativo ao viewport de verdade, sem mexer no scroll de nada. `DialogSideContent` (drawer) nunca teve esse problema (não usa `transform` pra posicionar, só `fixed right-0 top-0`).

**Segurança**: RLS cobre todas as 4 tabelas (testado via SQL Editor) — `super_admin`/`store_admin` via `for all`, mais leitura pública anônima (`for select using (active)`, sem checar role, já que visitante do storefront navega sem login) em `addon_groups`/`addon_options`/`product_addon_groups`, escopada só a linhas `active = true` (e produto ativo, no caso de `product_addon_groups`). Validação de seleção (single/multiple, max_quantity respeitado, adicional pertence à loja certa) no client (Zod) **e** reforçada em RPC continua pendente — essa validação é sobre a *escolha do cliente* no storefront (`confirm_order`), não sobre o CRUD de grupos/opções feito aqui, que já valida via Zod + RLS.

**Storefront (repositório do colega, fora daqui) — passo 6, ainda não feito**: `confirm_order` precisa aceitar adicionais selecionados por item (com a validação de seleção acima reforçada em RPC); carrinho/checkout do storefront precisa UI pra escolher. Leitura pública já liberada (ver "Segurança" acima) — falta só o contrato de escrita (`confirm_order`) e a UI de seleção no carrinho.

## Feature: Variação de produto (passos 1–5 implementados neste repo, passo 6 pendente no storefront)
Diferente de adicional — variação é **parte de definir o que o produto é**, não um extra opcional em cima. Exemplos reais: café com variação de intensidade (fraco/médio/forte); fondue com variação de sabor (chocolate/branco/morango) **e** variação de fruta ao mesmo tempo, cada uma independente. Um produto pode ter os dois — variação(ões) e adicionais — simultaneamente.

**Por que não é o mesmo modelo dos adicionais**: adicional é sempre opcional (regra travada em `isValidAddonSelection` — seleção vazia sempre válida). Variação é o oposto — se o produto tem uma variação vinculada, o cliente é obrigado a escolher antes de adicionar ao carrinho. Misturar as duas regras no mesmo schema forçaria condicional em cada camada (domínio, RLS, UI, copy). Por isso: tabelas novas em paralelo, não reaproveita `addon_groups`.

**Regras de negócio (decididas):**
- Grupo reutilizável (`variation_groups`), igual adicional — ex: grupo "Sabor" serve pra qualquer produto que tiver variação de sabor.
- **Sempre obrigatória** — se o grupo tá vinculado ao produto, cliente tem que escolher 1 opção antes de fechar o item. Diferente do adicional, não existe toggle de opcional aqui.
- **Sempre single-select** — variação é 1 escolha por dimensão (não dá pra pedir "fraco e forte" ao mesmo tempo). Multi-select não existe nesse modelo.
- Um produto pode ter **vários grupos de variação simultâneos** e independentes (ex: fondue = grupo "Sabor" + grupo "Fruta", cada um exigindo 1 escolha).
- Preço **pode variar por opção**, e o **efeito no preço é configurado por grupo** via `price_mode` (`'additive'` ou `'replace'`), decidido na criação do grupo, vale pra todo produto que usar aquele grupo — não é por produto:
  - `'additive'` (default) — soma a opção escolhida em cima do preço base, mesmo princípio de `addon_options.price` (0 = neutro, ex: "Intensidade": fraco/médio/forte não muda o preço).
  - `'replace'` — a opção escolhida **substitui** o preço base inteiro (ex: "Tamanho": Capuccino R$8 + variação "Grande" R$15 = R$15, não R$23). Se 2 grupos `replace` estiverem vinculados ao mesmo produto (raro), soma as opções escolhidas entre si em vez de escolher uma.
- Preço da opção escolhida (e o `price_mode` do grupo no momento) **trava no momento do pedido** (snapshot), mesmo princípio já usado em `order_items`/`order_item_addons` — mudar `price_mode` do grupo depois não reescreve pedido já feito.
- Vínculo produto↔grupo aqui é bem mais simples que o de adicional — não tem `selection_type`/`max_quantity` pra configurar (sempre single + sempre obrigatório), só "esse grupo se aplica a esse produto".

**Schema (criado, ver "Modelo de dados"):**
```
variation_groups          (id, store_id, name, active, price_mode: 'additive'|'replace' default 'additive')
variation_options         (id, group_id, name, price, active)
product_variation_groups  (product_id, variation_group_id, sort_order)  -- PK composta, sem config de seleção (sempre single+obrigatório), só sort_order (por produto)
order_item_variations     (id, order_item_id, variation_option_id, name, price, price_mode)
                           -- name/price/price_mode são snapshot, nunca referenciam variation_options/variation_groups ao vivo
                           -- sem coluna quantity — variação é 1 escolha por dimensão, não faz sentido "2x sabor chocolate"
```
`domain/product/variationPricing.ts` tem `applyVariationsToUnitPrice(unitPrice, variations)` — a função pura que resolve `replace` vs `additive` (testada). `OrderDashboardPage.tsx` usa ela pra calcular o total exibido no card; `VariationGroupModal.tsx` tem o seletor de `price_mode` na criação/edição do grupo; `VariationGroupListPage.tsx` mostra o modo numa coluna ("Efeito no preço").
RLS por `store_id` igual toda tabela de domínio, mesmo padrão de `addon_groups`/`addon_options`/`product_addon_groups`: `super_admin`/`store_admin` via `for all`, leitura pública anônima via `for select using (active)` — **usando a view `public_products` na checagem de produto ativo, não a tabela `products` direto** (bug real que apareceu nos adicionais e já veio corrigido de cara aqui: anônimo não lê `products` cru, só a view; `exists (select 1 from products where ...)` sempre dá falso pro anônimo).

**Camadas (Clean Architecture) — implementado:**
```
domain/product/Variation.ts                              -- entidades VariationGroup, VariationOption, ProductVariationGroup
domain/product/variationPricing.ts                        -- isValidVariationSelection/calculateVariationsTotal, puro, testado
application/product/VariationRepository.ts                -- interface (porta)
application/product/variationSchema.ts                    -- Zod (mesmo shape de addonSchema, arquivo/tipo próprio)
infrastructure/product/SupabaseVariationRepository.ts      -- implementação Supabase da porta acima
presentation/product/variations/useVariations.ts           -- hooks React Query (groups/options/vínculo produto)
presentation/product/variations/VariationGroupModal.tsx    -- CRUD de grupo (modal)
presentation/product/variations/VariationOptionModal.tsx   -- CRUD de opção dentro de um grupo (modal)
presentation/product/variations/VariationOptionsPanel.tsx  -- painel de opções de um grupo expandido
presentation/product/variations/VariationGroupListPage.tsx -- rota /products/variations, tabela de grupos expansível
presentation/product/variations/ProductVariationGroupsSection.tsx -- seção dentro do ProductModal pra vincular grupo(s) ao produto (só checkbox marca/desmarca, sem config — mais simples que a de adicional), mesmos 2 modos (`linked`/`draft`) do adicional
```
Entrada na UI: botão "Variações" em `/products` (`ProductListPage.tsx`) abre `/products/variations`. `ProductModal.tsx` mostra as duas seções (Variações primeiro, depois Adicionais) juntas, tanto criando produto novo (`mode="draft"`, vínculo aplicado só depois do produto ser criado) quanto editando um já existente (`mode="linked"`, persiste na hora) — ver detalhe completo do fluxo draft e do fix de nesting de `Dialog` na seção de Adicionais acima (vale pros dois).

`domain/order/Order.ts` ganhou `OrderItemVariation` + campo `variations: OrderItemVariation[]` em `OrderItem`, com join real em `SupabaseOrderRepository.ts` (mesmo padrão do `OrderItemAddon`).

**Segurança**: RLS cobre as 4 tabelas (mesmo padrão de adicional, testado). Validação de seleção (todo grupo obrigatório vinculado ao produto precisa de exatamente 1 opção escolhida) no client (Zod) **e** reforçada em RPC continua pendente — é sobre a *escolha do cliente* no storefront (`confirm_order`), não sobre o CRUD feito aqui.

**Storefront (fora daqui) — passo 6, ainda não feito**: `confirm_order` precisa aceitar variações escolhidas por item, junto com os adicionais (mesmo payload, dimensão a mais); carrinho/checkout do storefront precisa impedir "adicionar ao carrinho" sem resolver toda variação obrigatória do produto.

**Ordem de construção** (aprovada 1 passo de cada vez, mesmo fluxo usado nos adicionais):
1. ✅ SQL: schema + RLS (já usando `public_products` na política pública) + índices
2. ✅ `domain`/`application` (entidades, validação pura, interface, Zod) + testes unitários
3. ✅ `infrastructure` (repository Supabase)
4. ✅ `presentation`: gerenciar grupos/opções (CRUD, rota `/products/variations`)
5. ✅ `presentation`: vincular grupo(s) de variação ao produto dentro do `ProductModal`
6. ⬜ Combinar contrato com o storefront (fora deste repo)

## Feature: Atendente (implementada)
Rastreia **quem preparou** cada pedido — não é sobre quem atendeu o cliente no storefront, é sobre a pessoa da loja que executa o preparo. **100% deste repositório**, sem envolver o storefront — quem prepara só existe no fluxo do admin.

**Regras de negócio (decididas):**
- Atendente é escolhido **no momento de aceitar o pedido** — a transição `received` → `preparing` (botão "Avançar etapa" na coluna "Recebido"). Não em nenhuma outra transição.
- **Sempre obrigatório** — não é possível avançar de `received` pra `preparing` sem vincular um atendente. Trava tanto na UI quanto reforçada na RPC (`change_order_status`), nunca só no client.
- Se a loja não tem nenhum atendente cadastrado, precisa dar pra **cadastrar um ali mesmo, na hora**, sem sair da tela — mesmo padrão de "+ Novo grupo" já usado em adicionais/variações.
- Uma vez vinculado nessa transição, o atendente **trava no pedido** — não muda depois, mesmo princípio de outras coisas que travam após `received` (ver "Fluxo de status do pedido").
- Atendente é um cadastro leve **por loja**, sem login/auth — só nome + ativo/inativo. Não é papel novo em `profiles`.

**Schema (criado):**
```
attendants     (id, store_id, name, active, created_at)
```
`orders` ganha `attendant_id uuid null references attendants(id) on delete restrict` — nullable na coluna (pedido em `received` ainda não tem), e a RPC `change_order_status` rejeita a transição `received` → `preparing` se `p_attendant_id` vier nulo ou não pertencer à loja/estiver inativo. `revert_order_status` limpa `attendant_id` ao voltar pra `received`, então avançar de novo volta a pedir. RLS em `attendants` igual toda tabela de domínio (`super_admin`/`store_admin` via `for all`, escopado por `store_id`) — sem leitura pública, já que isso não é dado de storefront. `on delete restrict` bloqueia exclusão de atendente com pedido vinculado (mesmo padrão de produto/loja/usuário) — UI só permite desativar nesse caso (`AttendantInUseError`).

**Camadas (Clean Architecture) — implementado:**
```
domain/attendant/Attendant.ts                       -- entidade { id, storeId, name, active }
domain/order/orderStatusRules.ts                    -- needsAttendantToAdvance(status) — true só quando status === 'received'
application/attendant/AttendantRepository.ts         -- interface (porta)
application/attendant/AttendantInUseError.ts         -- erro de exclusão bloqueada (pedido vinculado)
application/attendant/attendantSchema.ts             -- Zod (name/active)
infrastructure/attendant/SupabaseAttendantRepository.ts -- implementação Supabase, catch do 23503 -> AttendantInUseError
presentation/attendant/useAttendants.ts               -- hooks React Query (list/save/delete)
presentation/attendant/AttendantModal.tsx              -- CRUD de atendente (modal)
presentation/attendant/AttendantListPage.tsx           -- rota /attendants, lista simples sem paginação (bounded por loja)
presentation/attendant/AcceptOrderModal.tsx             -- seletor de atendente + "+ Novo atendente" inline, aberto pelo Dashboard
presentation/order/OrderDashboardPage.tsx             -- "Avançar etapa" a partir de received abre AcceptOrderModal em vez de chamar changeStatus direto; outras transições inalteradas
```
`OrderRepository.changeStatus` ganha parâmetro `attendantId?: string`, repassado pro RPC como `p_attendant_id`. `Order`/`OrderRow` ganharam `attendantId`/`attendantName` (join com `attendants(name)`).

Entrada na UI: link "Atendentes" na sidebar (visível a `store_admin` e `super_admin`, diferente de "Usuários"/"Relatórios" que são só `super_admin`), rota `/attendants`.

**Ordem de construção** (aprovada 1 passo de cada vez, mesmo fluxo de sempre):
1. ✅ SQL: schema (`attendants` + `orders.attendant_id`) + RLS + índice, e ALTER na RPC `change_order_status`/`revert_order_status`
2. ✅ `domain`/`application` (entidade, `needsAttendantToAdvance`, interface, Zod) + testes unitários
3. ✅ `infrastructure` (repository Supabase + `OrderRepository.changeStatus` com `attendantId`)
4. ✅ `presentation`: gerenciar atendentes (CRUD, rota `/attendants`) + seletor/criação inline no Dashboard na transição `received` → `preparing`

## Feature: Preço lover em adicionais e variações (implementada)
`products.lover_price` já existia; estendido pra `addon_options`/`variation_options` — segunda coluna de preço opcional, **só pra exibir no cardápio** (o que o cliente lover paga por aquele adicional/variação específico). Escopo deliberadamente pequeno: **nenhuma lógica de resolução automática existe em lugar nenhum do sistema** — a atendente decide manualmente, na hora de fechar o pedido, se cobra o valor lover ou não. Não é um dado do pedido, não aparece no Dashboard, não entra em Relatórios (Relatórios continua sempre considerando o preço não-lover, `unit_price`/`order_item_addons.price`/`order_item_variations.price`, sem distinção).

**Regras de negócio (decididas):**
- `lover_price` é **opcional** em cada opção — `null` significa "mesmo preço pros dois", não "zero". Diferente de `products.lover_price` (que é obrigatório).
- Em variação `price_mode='replace'`, `lover_price` **não tem efeito nenhum no cálculo** — é só um dado de cadastro/exibição, igual em `additive`. Nenhum modo de variação faz resolução automática de lover.
- Nenhuma tabela de pedido (`order_item_addons`, `order_item_variations`) ganhou coluna nova — o snapshot continua sendo 1 preço só, decidido manualmente fora do sistema.

**Schema (criado):**
```
addon_options.lover_price       numeric null
variation_options.lover_price   numeric null
```
Sem mudança de RLS — colunas novas em tabela já coberta por política de linha (`for select using (active)`), sem view separada tipo `public_products`/`cost_price` (lover_price não é segredo, é preço público de cardápio).

**Camadas alteradas:**
```
domain/product/Addon.ts                              -- AddonOption ganha loverPrice: number | null
domain/product/Variation.ts                           -- VariationOption ganha loverPrice: number | null
application/product/addonSchema.ts                    -- addonOptionSchema: loverPrice via z.preprocess (string vazia -> null) + nullable
application/product/variationSchema.ts                -- mesmo padrão em variationOptionSchema
application/product/AddonRepository.ts                -- AddonOptionInput ganha loverPrice
application/product/VariationRepository.ts             -- VariationOptionInput ganha loverPrice
infrastructure/product/SupabaseAddonRepository.ts      -- lê/grava lover_price
infrastructure/product/SupabaseVariationRepository.ts  -- lê/grava lover_price
presentation/product/addons/AddonOptionModal.tsx       -- campo "Preço lover (R$) — opcional"
presentation/product/variations/VariationOptionModal.tsx -- campo "Diferença de preço lover (R$) — opcional"
presentation/product/addons/AddonOptionsPanel.tsx      -- lista mostra "R$ X · lover R$ Y" quando lover_price existe
presentation/product/variations/VariationOptionsPanel.tsx -- mesmo padrão, com "sem diferença" quando 0
```

## Feature: Editar itens do pedido com variação e adicional (implementada)
Antes só dava pra trocar quantidade/remover item — sem tocar variação/adicional, mesmo já existindo a feature completa (passos 1-5) pra ambos. Incrementado (não reescrito): mesmo modal `OrderItemsEditModal.tsx`, mesmo fluxo de sempre.

**Regras de negócio:**
- Item novo **e** item já no pedido podem ter variação/adicional escolhidos ou trocados — não só na criação.
- Se o produto tiver grupo de variação vinculado (obrigatório), bloqueia adicionar/salvar sem escolher 1 opção por grupo — mesma regra do storefront (`isValidVariationSelection`, reusada, não duplicada).
- Adicional continua opcional — `isValidAddonSelection` (single/multiple, `max_quantity`) valida por grupo, reusada do domínio existente.
- **Reforçado em RPC também** — fechava um pendente de dias anteriores: `add_order_item`/`update_order_item` agora validam a mesma coisa no Postgres (nunca confiar só no client), rejeitando adicional de outro produto ou seleção que estoura `max_quantity`/`selectionType`.
- Editar seleção de item existente **reescreve por completo** `order_item_variations`/`order_item_addons` daquele item (delete + insert, não é patch parcial) — sempre snapshot novo com nome/preço/price_mode atuais das opções, mesmo princípio de sempre.
- **Pedido nunca pode zerar** — não dá pra remover o último item (se só sobrar 1, o botão de remover fica desabilitado). Se o caso é "não quero mais esse pedido", o caminho é Cancelar, não esvaziar os itens. Reforçado em RPC (`remove_order_item` conta quantos itens sobram antes de apagar).

**RPC (alterado):**
```
add_order_item(p_order_id, p_product_id, p_quantity, p_variation_option_ids uuid[], p_addons jsonb)
update_order_item(p_item_id, p_quantity, p_variation_option_ids uuid[], p_addons jsonb)
  -- substitui update_order_item_quantity (removida, não é mais chamada em lugar nenhum)
remove_order_item(p_item_id)
  -- agora limpa order_item_addons/order_item_variations explicitamente antes de apagar a linha
```

**Camadas alteradas:**
```
application/order/OrderRepository.ts     -- OrderItemSelection { variationOptionIds, addons }; addItem/updateItem (renomeado de updateItemQuantity) ganham selection opcional
infrastructure/order/SupabaseOrderRepository.ts -- addItem/updateItem repassam p_variation_option_ids/p_addons pro RPC
presentation/order/useOrders.ts          -- useUpdateOrderItem (renomeado de useUpdateOrderItemQuantity)
presentation/order/ItemSelectionFields.tsx -- novo: seletor de variação (1 <select> por grupo obrigatório) + adicional (checkbox por opção, respeitando selectionType/maxQuantity), busca grupos/opções via os hooks que a tela de gerenciar variação/adicional já usa (useProductVariationGroupList, useVariationOptionList, useProductAddonGroupList, useAddonOptionList) — sem repository novo
presentation/order/OrderItemsEditModal.tsx -- linha de item novo ganha ItemSelectionFields abaixo da busca (bloqueia "+" se inválido); item existente ganha ícone lápis "Editar seleção do item" que expande a mesma seleção pré-preenchida, com Salvar/Cancelar
```
Pré-preenchimento na edição: `order_item_variations`/`order_item_addons` snapshot não guarda `group_id` — cada campo de grupo descobre sozinho se algum dos ids já salvos no item pertence às SUAS próprias opções (fetch por `groupId`), sem precisar de lookup reverso.

## Feature: Promoções (implementada)
CRUD do carrossel de promoções do cardápio do cliente. Schema/RLS/bucket de Storage/view pública já existiam (feitos pelo lado do `storefront`) — este repo só implementou a tela de gestão, replicando a arquitetura já usada pra Produtos (mesmo padrão de repository/hook/form, nada novo inventado).

**Regras de negócio:**
- `store_id` sempre a loja logada, nunca escolhível no form — mesmo isolamento multi-tenant do resto do admin.
- **Sem preço próprio** — o formulário não tem campo de preço; o carrossel do cliente sempre lê o preço do `product_id` vinculado ao vivo, nunca duplica/congela.
- **Sem vigência** — não existe `starts_at`/`ends_at`. "Desativar" é só desligar o toggle `active`.
- `sort_order` **não é campo de formulário** — é automático (próximo da lista ao criar, mesmo padrão de `linkGroupToProduct`) e só muda via arrastar-e-soltar na lista (`SortableList`/`SortableItem`, componente já existente, reusado sem mudança — mesmo padrão de reordenar grupo de adicional/variação dentro do produto).

**Schema (já existia, criado pelo storefront):**
```
promotions (id, store_id, title, subtitle, badge_label, image_url, product_id, sort_order, active, created_at)
```
RLS idêntico a `products` (`store_admin` só a própria loja via `current_store_id()`, `super_admin` tudo). View `public_promotions` (só `active=true`) é o que o storefront lê — este admin nunca usa essa view, sempre a tabela completa. Bucket de Storage `promotions` já criado (leitura pública, insert autenticado).

**Camadas (Clean Architecture) — implementado:**
```
domain/promotion/Promotion.ts                          -- entidade { id, storeId, title, subtitle, badgeLabel, imageUrl, productId, productName, sortOrder, active }; productName é join só de exibição
application/promotion/PromotionRepository.ts             -- interface (porta)
application/promotion/promotionSchema.ts                 -- Zod (title obrigatório; subtitle/badgeLabel opcionais; imageUrl obrigatório — promoção sem imagem não salva, diferente de produto)
infrastructure/promotion/SupabasePromotionRepository.ts   -- implementação Supabase; create calcula sort_order (max+1); reorder grava a lista inteira de uma vez (mesmo padrão de reorderProductAddonGroups)
infrastructure/storage/uploadPromotionImage.ts            -- bucket `promotions`, nomeia `${storeId}/${crypto.randomUUID()}-${nomeOriginal}` (nome original preservado, pedido explícito — diferente de uploadProductImage que só usa uuid.ext)
presentation/promotion/usePromotions.ts                   -- hooks React Query (list/save/delete/reorder)
presentation/promotion/PromotionModal.tsx                 -- form: título/subtítulo/selo/imagem (upload)/produto (Select, options de useActiveProductOptions já existente)/ativo (Checkbox)
presentation/promotion/PromotionListPage.tsx               -- rota /promotions, lista arrastável (drag reordena o carrossel), sem paginação (loja tem poucas promoções), thumbnail + título + produto vinculado + selo, editar/excluir
```
Entrada na UI: link "Promoções" na sidebar (visível a `store_admin` e `super_admin`, ao lado de "Produtos"), rota `/promotions`.

**Sem RLS/SQL novo** — tudo já existia antes deste repo tocar no assunto; só consumo (SELECT/INSERT/UPDATE/DELETE via client, respeitando as policies já criadas pelo storefront).

## Feature: Impressão de pedido na TM-T20 (implementada)
Cupom impresso automaticamente ao aceitar o pedido (`received` → `preparing`, mesmo ponto do `AcceptOrderModal` que já escolhe o atendente).

**Decisão de arquitetura**: sem servidor de ponte (QZ Tray, Node local, etc) — pedido explícito do usuário foi não instalar nada na máquina além do driver da impressora. Solução: impressão nativa do navegador (`window.print()`) numa impressora TM-T20 instalada como impressora comum do Windows via driver Epson APD (USB, sem cabo de rede disponível). Funciona bem pra multi-loja porque cada PC de loja imprime local, sem depender de servidor central — só precisa do driver + TM-T20 como impressora padrão daquele PC.

**Diálogo de impressão**: por padrão o navegador abre o diálogo nativo toda vez (atendente confirma/clica "Imprimir" manualmente) — dá pra pular com a flag `--kiosk-printing` num atalho dedicado do Chrome, ver "Impressão silenciosa" logo abaixo (opcional, configurado por loja que quiser). Formato do cupom: 80mm (padrão da TM-T20); área imprimível real é ~72mm, não 80mm — `@page`/`#print-receipt-root` usam 72mm (bug real corrigido: página em 80mm cortava a coluna de valor/centavos à direita, testado com impressora física).

**Como funciona**: `printOrderReceipt.ts` monta uma raiz React separada (`createRoot`) fora de `#root`, direto em `document.body`, renderiza `OrderReceipt.tsx` e chama `window.print()`. CSS em `index.css` (`@media print`) esconde tudo que não for `#print-receipt-root` na hora de imprimir; escuta `afterprint` pra desmontar e remover o container depois (funciona tanto se o atendente imprime quanto se cancela o diálogo).

**Conteúdo do cupom**: nome da loja, número curto do pedido (últimos 8 caracteres do uuid, maiúsculo — não existe número sequencial no schema), data/hora, canal (`orderChannelLabel`), mesa/endereço de entrega quando aplicável, dados do cliente, itens com variação/adicional/observação (mesma formatação de `OrderItemsList`), total (`calculateOrderTotal`, mesma fórmula do Dashboard/Relatórios) e nome do atendente.

**Camadas:**
```
presentation/order/OrderReceipt.tsx       -- componente puro de apresentação do cupom, estilo inline (monoespaçado, preto no branco, independe do tema do app)
presentation/order/printOrderReceipt.tsx  -- monta OrderReceipt numa raiz React isolada e dispara window.print()
presentation/attendant/AcceptOrderModal.tsx -- guarda attendantName junto com attendantId (seleção ou criação inline) e chama printOrderReceipt no onSuccess da troca de status; busca nome da loja via useStore(order.storeId)
index.css                                  -- @media print isolando #print-receipt-root
```

**Validado com impressora física** (via USB, driver Epson APD, TM-T20 como impressora padrão do Windows) — fluxo completo testado de ponta a ponta: cupom sai com layout, densidade e largura corretos.

### Impressão silenciosa (sem diálogo) — opcional, por PC de loja
Sem instalar nada além do driver, a única forma de pular o diálogo de impressão do navegador é a flag `--kiosk-printing` num atalho dedicado do Chrome — imprime direto na impressora padrão do Windows. Precisa ser feito 1x em cada PC de loja que quiser esse comportamento (quem não configurar continua vendo o diálogo normal, sem quebrar nada).

**Passo a passo:**
1. Área de trabalho → botão direito → **Novo** → **Atalho**
2. Cola exatamente:
   ```
   "C:\Program Files\Google\Chrome\Application\chrome.exe" --kiosk-printing
   ```
   (ajusta o caminho se o Chrome tiver instalado em `Program Files (x86)`)
3. Nome do atalho: qualquer coisa **genérica** (ex: "Painel Impressao") — nunca usa o nome de um perfil do Chrome nem cria pelo botão "Criar atalho" de `chrome://settings/manageProfile`
4. Fecha **todo** Chrome aberto (Gerenciador de Tarefas → mata todo processo "Google Chrome", não só as janelas visíveis)
5. Abre só por esse atalho novo — confirma em `chrome://version`, linha "Linha de comando", que `--kiosk-printing` aparece
6. Testa: avança um pedido de `Recebido` → `Em preparo` e confere se não abre diálogo

**Cuidado (bug real encontrado, não reintroduzir)**: atalho de **perfil** do Chrome (aquele gerado automaticamente com nome "NomeDoPerfil - Chrome", ícone que o próprio Chrome cria) tem checagem de integridade que **reescreve o atalho sozinho** e derruba qualquer flag customizada adicionada nele — `--kiosk-printing` e até `--profile-directory` desapareciam da linha de comando mesmo estando escritos no campo Destino. Só funciona com atalho criado manualmente do zero (passo 1-3 acima), nunca editando um atalho de perfil já existente.

## Feature: Consolidação de pedidos por mesa / comanda (implementada)
Pedido trazido pela cliente: pessoas diferentes da mesma mesa pedindo por celulares diferentes apareciam como pedidos 100% desconectados — sem jeito de a equipe ver "tudo que é da mesa 3" nem cobrar a mesa de uma vez. Escopo decidido com 2 perguntas fechadas antes de codar (ver abaixo), depois expandido por feedback ao ver o resultado ao vivo com pedido real (Mesa 2, 2 celulares).

**Decisões de escopo (perguntas fechadas, não assumidas):**
- Kanban continua **por pedido** em `received`/`preparing` — cozinha não muda de ritmo, um pedido pode estar "Em preparo" enquanto outro da mesma mesa ainda tá "Recebido". Um resumo/badge separado é que mostra a mesa consolidada.
- Comanda **fecha manualmente pela equipe** (nunca automático) — evita mesa 5 do almoço se misturar com mesa 5 do jantar. Só libera fechar depois que todo pedido da sessão tá `finalized`/`cancelled`.
- Depois de ver funcionando ao vivo, pedido adicional da cliente: na coluna **"Entregue"**, pedidos (2+) da mesma mesa viram **1 card só** (itens + total por pessoa + total geral) — facilita a atendente cobrar a mesa. Cada pedido dentro do card mesclado mantém botão próprio de avançar, **e** tem um botão "Finalizar tudo" que fecha a mesa inteira num clique. Em `received`/`preparing`/`finalized` os cards continuam individuais (mesclagem é só o ponto de cobrança).

**Schema (criado):**
```
table_sessions (id, store_id, table_number, status: open|closed, opened_at, closed_at)
orders.table_session_id  uuid null references table_sessions(id)
```
Índice único parcial `(store_id, table_number) where status='open'` — garante só 1 sessão aberta por mesa por vez, e é o mesmo índice usado pelo `on conflict` do trigger abaixo (sem corrida entre 2 pedidos quase simultâneos da mesma mesa).

**Vínculo automático — decisão importante, revista depois do teste ao vivo**: o plano original esperava que o `confirm_order` do storefront (repo separado) achasse-ou-criasse a sessão aberta da mesa. Testando com pedido real (Mesa 2, Selso + Bernardo) os cards **não mesclaram** porque `table_session_id` nunca era gravado — o storefront não tinha esse código. Em vez de esperar mudança no outro repositório, a solução virou um **trigger no Postgres** (`assign_table_session`, `before insert on orders`) que resolve isso sozinho pra qualquer INSERT em `orders`, não importa quem grava — elimina a dependência cross-repo inteira, "passo 6" nunca precisou existir. Trigger usa `insert ... on conflict (store_id, table_number) where status='open' do update ... returning id` (não select-depois-insert) pra ser atômico sob concorrência.

**Camadas (Clean Architecture) — implementado:**
```
domain/order/Order.ts                          -- Order ganha tableSessionId: string | null
domain/order/tableSessionRules.ts               -- canCloseTableSession, groupOrdersByTableSession (resumo/badge),
                                                    groupDeliveredOrdersByTable (mescla só coluna Entregue, 2+ pedidos) — puro, testado
application/order/TableSessionRepository.ts      -- interface (porta): listOpenIds, close
infrastructure/order/SupabaseTableSessionRepository.ts -- implementação Supabase
infrastructure/order/SupabaseOrderRepository.ts  -- toOrder mapeia table_session_id
presentation/order/useTableSessions.ts           -- useOpenTableSessionIds, useCloseTableSession
presentation/order/useOrders.ts                  -- useFinalizeTableOrders (bulk "Finalizar tudo" — cada pedido passa
                                                    pelo change_order_status de sempre, só a orquestração é client-side)
presentation/order/TableSessionSummaryBar.tsx    -- badge "Mesa X · N pedidos · total · Fechar mesa" no topo do Dashboard,
                                                    só sessão ainda aberta (consulta listOpenIds, não só os pedidos —
                                                    ver bug abaixo)
presentation/order/TableGroupCard.tsx            -- card mesclado da coluna Entregue: 1 seção por pedido (nome, itens,
                                                    total, "Avançar etapa" próprio) + total geral + "Finalizar tudo"
presentation/order/OrderDashboardPage.tsx        -- coluna 'delivered' usa groupDeliveredOrdersByTable; outras colunas
                                                    inalteradas
```

**RPC (criada):**
```
close_table_session(p_session_id)  -- reforçado em Postgres: rejeita se algum pedido vinculado ainda não
                                       tá finalized/cancelled; checa role/store do caller (super_admin ou
                                       store_admin da própria loja)
```

**Segurança**: RLS em `table_sessions` mesmo padrão de toda tabela de domínio (`super_admin`/`store_admin` via `for all`, escopado por `store_id`). Regra de fechamento (todo pedido terminal) reforçada na RPC, não só no client — testado ao vivo chamando a RPC direto (sessão com pedido em aberto rejeitada, sessão só com `finalized`/`cancelled` fechou).

**Cuidado (bug real encontrado e corrigido, não reintroduzir)**: primeira versão do `TableSessionSummaryBar` derivava tudo só dos `orders` já carregados — depois de fechar a mesa pela RPC, o botão "Fechar mesa" continuava aparecendo clicável (clicar de novo dava erro "já fechada"), porque nada no client sabia que a sessão tinha virado `closed` no banco. Fix: Dashboard busca `listOpenIds` (sessões realmente abertas) e filtra o resumo por isso — some da tela assim que fecha, sem esperar reload.

**Testado ao vivo, ponta a ponta, com dado real e de teste** (não só type-check): RPC `close_table_session` bloqueando/liberando conforme esperado, trigger `assign_table_session` vinculando 2 pedidos da mesma mesa na mesma sessão automaticamente (inserção direta sem `table_session_id`, simulando o storefront), card mesclado renderizando com 3 pedidos reais, avanço individual dentro do card, "Finalizar tudo" fechando a mesa inteira com 1 clique e liberando o "Fechar mesa" da barra de resumo em seguida.

**Refinamentos pós-uso real (feedback direto vendo a tela com pedido de verdade)**:
- `TableSessionSummaryBar` foi tirada da tela nessa rodada (pedido explícito, "essa parte não precisa existir"), depois **devolvida** numa auditoria posterior (Clean Architecture/SOLID/escalabilidade) que achou CRÍTICO: sem ela, `close_table_session` não tinha nenhum chamador vivo na UI, então a sessão de uma mesa ficava aberta pra sempre — almoço e jantar na mesma mesa se fundiam na mesma comanda, e "Finalizar tudo" fechava pedido de turno errado junto. Componente/hooks nunca saíram do código (só ficaram sem consumidor); `OrderDashboardPage.tsx` voltou a renderizar `<TableSessionSummaryBar>` logo abaixo do banner de notificação, alimentada por `groupOrdersByTableSession(orders)` filtrado por `useOpenTableSessionIds` (mesmo fix de "some da tela assim que fecha" descrito acima). Fechamento continua **manual, pela equipe** — decisão de escopo original nunca mudou, só o bug de ausência total de botão foi corrigido.
- `TableGroupCard`: CPF e telefone do cliente ficam em linhas separadas (telefone embaixo do CPF), nunca na mesma linha — mesmo padrão replicado em `OrderCard`. Botão "Avançar etapa" de cada pedido dentro do card usa o mesmo estilo primário dos outros cards do kanban (não link sublinhado), em tamanho reduzido (`px-3 py-1.5 text-sm`) pra caber bem quando a mesa tem várias pessoas. Ganhou também "Voltar etapa" por pedido (antes só existia "Avançar etapa" mesclado) — mesma regra `canRevert` do card individual.

## Feature: QR Code de mesa (implementado neste repo, passo do storefront pendente)
Pedido 6 da cliente: cada mesa deve ter um QR Code próprio que abre o cardápio já com a mesa preenchida, e todo pedido feito a partir dali continua entrando na mesma comanda enquanto ela estiver aberta.

**O que já estava pronto**: o vínculo automático à comanda (trigger `assign_table_session`, ver "Feature: Consolidação de pedidos por mesa") já cobre a parte "continua vinculado enquanto aberta" — funciona não importa como o `table_number` chega no pedido (digitado ou vindo do QR), então essa metade do pedido da cliente já estava resolvida antes de começar essa feature.

**Decisões de escopo (perguntas fechadas antes de codar):**
- Numeração de mesa **livre, sem lista salva no banco** — mesmo espírito de `table_number` já ser texto livre hoje, sem tabela `tables`. A tela só pede um intervalo ("Da mesa" / "Até a mesa") e gera todos os QR Codes de uma vez.
- Geração fica **dentro de Configurações** (mesmo lugar que já tem o link "Ver cardápio" da loja), não em tela/rota nova.

**Contrato de URL com o storefront**: `buildTableMenuUrl` monta `${VITE_STOREFRONT_URL}/${slug}/mesa/${numeroDaMesa}` — path, não query param. Combinado com quem implementou a leitura do lado do storefront (não `?mesa=`, que era o formato inicial antes de alinhar).

**Camadas:**
```
domain/store/tableQrUrl.ts              -- buildTableMenuUrl (monta a URL) + tableNumberRange (gera "1".."N" a partir de um intervalo), puro, testado
presentation/settings/TableQrSheet.tsx  -- folha de impressão (grid de QR + nome da loja + "Mesa N"), estilo inline independente do tema, mesmo princípio de OrderReceipt.tsx
presentation/settings/printTableQrCodes.tsx -- gera as imagens (lib `qrcode`) e dispara window.print() numa raiz React isolada, mesmo mecanismo de printOrderReceipt.tsx
presentation/settings/SettingsPage.tsx  -- card próprio "QR Code de mesa" (só aparece se a loja tem supportsDineIn), campos "Da mesa"/"Até a mesa" + botão "Gerar e imprimir"
```
`index.css`: `@media print` passou a reconhecer 2 raízes de impressão (`#print-receipt-root` do cupom, `#print-qr-root` novo) sem uma esconder a outra — a folha de QR sobrescreve o `@page` de 72mm (pensado pro cupom térmico) com um `<style>` injetado só durante aquele print (tamanho de página normal A4/Letter), removido no cleanup junto com a raiz.

**Cuidado (ajuste feito ainda na primeira versão)**: a seção "QR Code de mesa" nasceu como uma caixa aninhada dentro do formulário "Dados da loja" — destoava do resto da tela (que usa cards independentes pra "Alerta de pedido novo"/"Zona de risco"). Virou card próprio, irmão do formulário, mesmo padrão visual das outras seções de Configurações.

**Testado ao vivo**: com `VITE_STOREFRONT_URL` configurado, gerar QR Codes de 3 mesas produziu 3 imagens distintas (conteúdo diferente por mesa, confirmado visualmente), nome da loja + número da mesa embaixo de cada uma, `window.print()` disparado corretamente.

**Storefront (fora daqui)**: rota combinada com quem implementa lá é `/:storeSlug/mesa/:tableNumber` (path, não query param — ajustado depois da primeira versão). Esse lado precisa ler o número da mesa nessa rota e pré-preencher no pedido (sem pedir pro cliente digitar), além de já vir marcado como `order_type = 'dine_in'`. Não testado ponta a ponta daqui — confirma com quem mexe no storefront se a rota já está implementada e lendo o parâmetro. O vínculo à comanda (trigger no Postgres, já pronto neste repo) funciona assim que o `table_number` chegar, de qualquer jeito que chegue.

## Feature: Combo e desconto em Promoções (implementado neste repo, storefront pendente)
Pedido 11 da cliente: esclarecer se toda promoção exige produto novo duplicado no catálogo (ex: cadastrar "Combo água + fondue" como produto próprio) ou se dá pra montar combo/desconto em cima de produto já cadastrado, sem duplicar. Construído dentro da feature `Promoções` já existente (não virou sistema separado), pedido explícito da cliente/usuário.

**Decisões de escopo (perguntas fechadas antes de codar):**
- Desconto é **percentual OU valor fixo em R$**, escolhido pelo lojista no cadastro (nunca os dois juntos).
- Produto do combo é **livre escolha** — sem restrição de categoria, lojista escolhe qualquer produto ativo.
- Promoção continua **só ativo/inativo**, sem vigência (`starts_at`/`ends_at`) — mesmo modelo de sempre.
- **Múltiplas promoções podem valer ao mesmo tempo** — sem exclusividade mútua no cadastro.
- **Desconto opcional por promoção** — promoção sem desconto continua existindo exatamente como antes (só destaque visual), decisão explícita pra não quebrar as já cadastradas.

**Modelo escolhido (unifica "desconto simples" e "combo" na mesma estrutura)**: 1 promoção vincula a 1 produto principal (`product_id`, como sempre existiu) + opcionalmente mais produtos extras (`promotion_combo_items`, livre escolha + quantidade) — é combo só quando tem 1+ item extra. O desconto (quando marcado) aplica sobre a soma do produto principal + todos os itens extras.

**Cuidado de compatibilidade (levou ao desenho final)**: `promotions.product_id` é obrigatório hoje e o storefront **já lê ele em produção** pra mostrar imagem/preço no carrossel — não dava pra remover nem tornar opcional (regra do projeto: schema compartilhado só aditivo, nunca aperta o que produção já usa). Por isso `product_id` continua exatamente como estava (produto principal/imagem do card); tudo que é novo é 100% aditivo (`promotion_combo_items` + 2 colunas nullable em `promotions`).

**Schema (criado):**
```
promotions ganha (colunas novas, opcionais):
  discount_type   text null check (in ('percent', 'fixed_amount'))
  discount_value  numeric null check (is null or > 0)

promotion_combo_items (tabela nova):
  id, promotion_id, product_id, quantity
```
RLS em `promotion_combo_items`: `super_admin`/`store_admin` via `for all` (join até a loja através de `promotions`), mesmo padrão de `product_addon_groups`. **Sem policy de leitura pública** — o `public_promotions` que o storefront lê é uma view do lado deles (fora deste repo); pra combo/desconto aparecer no cardápio, quem mexe no storefront precisa estender essa view (ou criar policy própria) pra incluir as colunas/tabela novas.

**Camadas (Clean Architecture) — implementado:**
```
domain/promotion/Promotion.ts            -- ganha discountType, discountValue, comboItems (PromotionComboItem[])
domain/promotion/promotionPricing.ts     -- calculatePromotionBaseTotal (soma produto principal + itens do combo) e
                                             calculatePromotionDiscountedTotal (aplica percentual/valor fixo, nunca
                                             fica negativo), puro, testado — é o contrato de cálculo que o storefront
                                             replica pra aplicar no carrinho
application/promotion/PromotionRepository.ts -- PromotionInput ganha discountType/discountValue/comboItems
application/promotion/promotionSchema.ts     -- Zod: discountValue vira null com preprocess (string vazia -> null,
                                                 mesmo padrão de lover_price); refine garante valor obrigatório
                                                 quando discountType setado, e percentual nunca passa de 100
infrastructure/promotion/SupabasePromotionRepository.ts -- create/update reescrevem promotion_combo_items por
                                                 completo (delete + insert, mesmo princípio de order_item_variations);
                                                 reorder ganhou discount_type/discount_value no select/upsert (upsert
                                                 em lote precisa do row inteiro, mesmo cuidado já documentado ali)
presentation/promotion/PromotionModal.tsx    -- seção "Combo — produtos extras" (Combobox pra buscar+adicionar produto,
                                                 lista com quantidade editável + remover, estado local não fica no
                                                 react-hook-form) + seção "Aplicar desconto" (checkbox liga/desliga,
                                                 Select percentual/valor fixo, Input do valor)
presentation/promotion/PromotionListPage.tsx -- linha da lista ganha "+N produto(s)" quando é combo, e badge
                                                 "20% OFF"/"R$ X OFF" quando tem desconto
```

**Testado ao vivo, ponta a ponta, com produto real** (não só type-check): criada promoção combo (produto principal + 1 item extra) com desconto percentual 20%, salva e confirmada direto no banco (`promotion_combo_items` com o produto/quantidade certos, `discount_type`/`discount_value` certos), reabrir pra editar recarrega tudo (combo item + desconto) exatamente como salvo, excluir a promoção apaga `promotion_combo_items` sozinho via `on delete cascade` (confirmado, sem precisar apagar manual).

**Storefront (fora daqui) — pendente**: `confirm_order` precisa calcular o total com desconto (usando a mesma fórmula de `calculatePromotionDiscountedTotal`, pra nunca divergir do que foi decidido aqui) e gravar o preço **já com desconto** em `order_items.unit_price` — snapshot, mesmo princípio de sempre (nunca recalcular depois). View pública precisa expor `discount_type`/`discount_value`/`promotion_combo_items` pro carrinho do cliente conseguir montar o combo e aplicar o desconto.

**Rodada 2 — perguntas certeiras do dev do storefront antes de mexer no checkout, expuseram 2 furos reais:**
1. `unit_price` nunca pode vir calculado do client (`confirm_order` já recalcula tudo server-side a partir de `products.price`, mesma razão que a RPC existe) — cálculo de combo/desconto tem que acontecer **dentro** da RPC, usando `promotion_id` por item pra ela buscar `promotion_combo_items`/`discount_type`/`discount_value` sozinha. Formato exato de `p_items` pra isso é decisão conjunta com quem mexe na RPC (fora deste repo) — não adivinhado aqui.
2. `promotionPricing.ts` só calculava o **total agregado** do combo — nunca distribuía por linha. Resolvido: `distributePromotionDiscount` (mesmo arquivo), distribui proporcional ao preço original de cada linha, ajustando centavo a centavo (método do maior resto) pra soma bater EXATAMENTE com o total descontado — testado com 30 combos gerados (preço/quantidade variados) + casos de resto feio manual, sempre exato. `unitPrice` pode sair com mais de 2 casas decimais de propósito (soma exata > exibição redonda, igual todo preço no sistema já funciona).

**Decisões extras confirmadas nessa rodada:**
- Desconto **também se aplica sobre `lover_price`** (mesma fórmula, chamada 2x — uma com preço normal, outra com lover).
- `order_items` ganhou `promotion_id uuid null references promotions(id)` — marca quais linhas vieram do mesmo combo. `domain/order/orderItemGrouping.ts` (`groupOrderItemsByPromotion`, puro, testado) agrupa por isso; `OrderItemsList.tsx` (usado em `OrderCard`/`OrderDetailsDrawer`/`TableGroupCard`/`OrderReceipt` — todo lugar que lista item de pedido) desenha um bloco "Combo" ao redor dos itens que compartilham `promotionId`, item avulso continua linha solta.
- Quantidade de combo: se cliente pede 2× do combo, cada linha (produto do combo) vai com `quantity` já multiplicado — 1 linha por produto, nunca repete linha (mesmo padrão de `quantity` em item avulso).

**Testado ao vivo**: pedido de teste com 3 itens (2 com `promotion_id` igual = combo, 1 avulso sem `promotion_id`) renderizou exatamente como esperado no card — bloco "Combo" ao redor dos 2 primeiros, item avulso fora, total batendo.

**Rodada 3 — preço não aparecia no cadastro (achado testando de verdade, não no código)**: `PromotionModal.tsx` deixava de mostrar o preço do produto principal e de cada item do combo — o dado sempre veio (`searchActive`/`useProduct` já retornam o produto completo), só nunca foi desenhado na tela. Corrigido: modal mostra preço de cada item, total do produto+combo, e total com desconto (valor cheio riscado do lado) enquanto a promoção é montada. `PromotionComboItem` (domínio) ganhou `price` — antes só existia no comentário, nunca no tipo de verdade.

**Confirmado com o dev do storefront, testado com produto real (Fondue: preço base R$26, variação "Banana" R$24 replace)**: quando um item do combo tem variação, o preço que entra na soma que sofre desconto é o **preço já resolvido pela variação** (`applyVariationsToUnitPrice`, mesma função que já existe aqui), não o `products.price` cru — bateu R$24, não R$26, provando que não foi coincidência. **Adicional fica de fora do desconto sempre** — soma cheio, sem desconto, depois de calculado o total do combo. Mesma ordem que `itemTotal()` já usa pra item avulso (variação resolve o preço base, adicional soma por cima) — `distributePromotionDiscount` não precisou mudar (já é agnóstico a como cada linha chegou no preço), só ficou registrado aqui o contrato exato. Storefront achou e corrigiu, do lado deles, um bug real onde a variação sobrescrevia o preço do combo por engano.

**Desconto sobre `lover_price` — implementado**: `PromotionComboItem` (domínio) e `Product` já carregavam `loverPrice`/`lover_price` — só faltava usar. `PromotionModal.tsx` agora calcula e mostra "Total do produto + combo" e "Total com desconto" com a versão lover ao lado (mesma `calculatePromotionBaseTotal`/`calculatePromotionDiscountedTotal`, chamada de novo com os preços lover de cada item). Testado ao vivo: água R$5/lover R$4 + fondue R$20/lover R$16, 20% off → normal R$20,00, lover R$16,00 — bateu exato nos dois. Storefront ainda precisa confirmar se replica esse cálculo lover também (não confirmado do lado deles ainda).

## Feature: Categoria de produto (implementada)
Pedido da cliente: no cadastro de produto não dava pra ver/reaproveitar categoria já usada — `category` era texto livre puro, sem autocomplete nem tabela própria, risco real de fragmentação silenciosa ("Bebidas" vs "bebidas" vs "Bebidas " virando 3 categorias diferentes na prática, mesmo aparentando a mesma coisa pro lojista). Perguntei se o ajuste devia ser só uma sugestão de UX (`<datalist>`) ou a correção de verdade no banco — **usuário escolheu a versão certa**: categoria vira entidade própria, mesmo padrão já usado pra Atendente/Grupo de Adicional/Grupo de Variação (tabela dedicada, RLS, CRUD, picker com busca + criação inline).

**Cuidado de compatibilidade (mesmo motivo de sempre)**: `products.category` (texto) é lido direto pela produção (`main`) e pelo storefront — não podia sumir nem virar obrigatório de outro jeito. Solução: `category_id` novo (FK, nullable) vira a fonte de verdade daqui pra frente, e `category` (texto) continua gravado **espelhando o nome da categoria escolhida**, calculado no submit do `ProductModal` — nunca os dois divergindo, e nada em produção quebra até o dia (futuro, fora de escopo agora) de aposentar a coluna texto de vez.

**Schema (criado, com backfill):**
```
categories (id, store_id, name, active, created_at)
products.category_id  uuid null references categories(id)
```
Backfill rodado 1x na migration: agrupa o `category` texto já existente por loja, case/espaço-insensitive (`lower(trim(category))`), cria 1 linha em `categories` por grupo (nome canônico = `MIN(category)`, primeira grafia em ordem alfabética) e liga `products.category_id` de volta pelo match. RLS mesmo padrão de toda tabela de domínio (`super_admin`/`store_admin` via `for all` escopado por `store_id`) + leitura pública (`for select using (active = true)`, mesmo motivo de adicional/variação — storefront também lê).

**Camadas (Clean Architecture) — implementado:**
```
domain/category/Category.ts                     -- entidade { id, storeId, name, active }
application/category/CategoryRepository.ts       -- interface (porta)
application/category/categorySchema.ts           -- Zod (name obrigatório, active)
application/category/CategoryInUseError.ts       -- erro de exclusão bloqueada (produto vinculado), mesmo padrão de AttendantInUseError
infrastructure/category/SupabaseCategoryRepository.ts -- implementação Supabase, catch do 23503 -> CategoryInUseError
presentation/category/useCategories.ts            -- hooks React Query (list/save/delete), mesmo padrão de useAttendants
presentation/category/CategoryModal.tsx           -- CRUD de categoria (modal), com onCreated pro fluxo de criação inline
presentation/category/CategoryListPage.tsx        -- rota /produtos/categorias, lista simples (sem paginação, bounded por loja) + toolbar "← Produtos" (mesmo padrão de Ajuste 1, ver abaixo)
```
`domain/product/Product.ts` ganhou `categoryId: string | null` e `categoryName: string | null` (join só de exibição); `category` (texto) marcado `@deprecated`, mantido só por compatibilidade. `SupabaseProductRepository` usa `PRODUCT_SELECT = '*, categories(name)'` em vez de `select('*')` cru (mesmo padrão de `ORDER_SELECT`/`PROMOTION_SELECT`), e o filtro "Só produtos incompletos" trocou de `category.is.null` pra `category_id.is.null`. `isProductIncomplete` também passou a checar `categoryId`, não mais `category`.

Entrada na UI: botão "Categorias" na toolbar de `/produtos` (ao lado de "Variações"), e dentro do `ProductModal`, o campo Categoria virou busca (`Combobox`, mesmo componente de Adicionais/Variações) com botão **"+ Nova categoria"** que abre `CategoryModal` sem sair do modal de produto — categoria recém-criada já fica selecionada na hora (`onCreated` seta `categoryId` no form). Herda de graça os 2 fixes centralizados em `ui/Dialog.tsx` (Escape não fecha o modal de produto junto, sem scroll-jump ao abrir a busca — ver "Ajuste 2" abaixo) por já usar o mesmo `Dialog`/`Combobox` compartilhado, zero código extra.

**Testado ao vivo, ponta a ponta**: criar categoria nova inline durante cadastro de produto (toast "Categoria criada.", já vem selecionada) → buscar e escolher categoria já existente (lista mostrando "Bebidas/Doces/Pastel" reais da loja) → Escape com a busca aberta não fecha o modal de produto (regressão confirmada não reintroduzida) → scroll do modal não pula pro topo ao abrir a busca (`scrollTop` idêntico antes/depois, confirmado via instrumentação) → salvar grava `category_id` e `category` (texto espelhado) juntos → listagem de Produtos mostra a categoria certa na coluna e o badge "Incompleto" reage a `categoryId`, não mais ao texto antigo.

## Ajuste 1 — navegação entre Produtos/Adicionais/Variações (implementado)
Nas telas `/produtos/adicionais` e `/produtos/variacoes` não tinha como voltar pra Produtos nem trocar entre as duas sem usar o sidebar. As duas telas ganharam toolbar com botão "Produtos" (ícone `ArrowLeft` do lucide-react — projeto usa Radix + lucide-react, não shadcn, apesar da semelhança visual) + botão pra trocar pra seção irmã (Adicionais ↔ Variações), mesmo padrão replicado em Categorias (`CategoryListPage.tsx`).

## Ajuste 2 — bugs de Dialog aninhado no ProductModal (implementado)
Ao criar produto novo e usar a busca (`Combobox`) pra vincular Adicional/Variação já existente, 2 bugs reais:
1. **Esc fechava o modal de produto inteiro**, não só a busca — perdia o formulário todo. Causa: `DismissableLayer` do Radix não isola Esc por camada quando o Popover não é portaled (trade-off já aceito antes por outro motivo, ver "Feature: Adicionais de produto"). Fix central em `ui/Dialog.tsx`: `onEscapeKeyDown` cancela o fechamento do Dialog se existir `[data-radix-popper-content-wrapper]` aberto na hora (cobre Popover/Select/DropdownMenu, não só Combobox).
2. **Clicar só pra abrir a busca (sem digitar nada) fazia o conteúdo do modal pular pro topo**, perdendo a posição de scroll. Causa: `DialogContent` centralizava via `transform` (`-translate-x-1/2 -translate-y-1/2`), e `transform` num ancestral vira *containing block* de descendente `position: fixed` (regra do CSS) — o Popper do Radix usa `fixed`, calculava posição relativa ao container com scroll em vez do viewport, e o navegador "corrigia" isso resetando o scroll. Fix: `DialogContent` trocou a centralização por wrapper flexbox (`fixed inset-0 flex items-center justify-center`) em vez de `transform` no conteúdo — sem `transform` em nenhum ancestral, Popper volta a se posicionar certo relativo ao viewport real.

Os dois fixes moram em `ui/Dialog.tsx` (não em `ProductModal.tsx` nem em `Combobox.tsx`) — qualquer novo uso de `Dialog`+`Popover`/`Select` aninhado no app inteiro já herda os dois de graça (confirmado: a seção de Categoria acima usa exatamente esse caminho, sem precisar de nenhum ajuste extra).

## Testes
- Vitest + Testing Library (unitário — `domain`/`application`, sem mockar Supabase, é lógica pura) e Playwright (E2E) já implementados na Fase 1, adiantados em relação ao plano original.
- E2E real: login → avançar status do pedido → reflete no kanban. Roda contra o Supabase de dev de verdade (não staging — staging só chega na Fase 2), com conta de teste em `.env.local` (`E2E_TEST_EMAIL`/`E2E_TEST_PASSWORD`, nunca commitado).
- RLS validado na prática, não só testado por ausência de bug: 2 contas `store_admin` de lojas diferentes, cada uma tentando query explícita filtrando pela loja da outra (`orders?store_id=eq.<loja-alheia>` direto via REST, não só pela UI) — confirmado bloqueado nos dois sentidos.
- Checklist antes de fechar qualquer tarefa de UI: `npx tsc -b`, `npx oxlint src`, `npx vitest run` (todos limpos) — e conferir visualmente no navegador (ou via Playwright screenshot) antes de dar a tarefa por concluída, type-check não substitui ver a tela renderizada.

## Segurança
- `service_role` do Supabase nunca no client. Variáveis de ambiente em `.env.local` (gitignored).
- Validação com Zod no client + reforço em RPC do Postgres pra operações críticas (estoque, status).
- Sessão via Supabase Auth (JWT); nunca autenticação própria.

## Escalabilidade
- Índice em `store_id` (e composto, ex: `(store_id, status)`) em toda tabela filtrada por loja.
- Paginação obrigatória em listagem. Code-splitting por rota.
- Adicionar loja nova = uma linha em `stores`, sem migration nem deploy.
