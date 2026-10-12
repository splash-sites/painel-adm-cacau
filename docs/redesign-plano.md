# Plano do redesenho (identidade Ganache)

Este plano passa o design aprovado no canvas para o código. Depois do seu "ok", eu executo tudo de uma vez e só volto para mostrar o resultado.

Canvas de referência: https://claude.ai/artifact/BGkhda9WLYBTGH432PvESF (página "Fluxo final")

## Regras

- O trabalho fica todo no seu computador, em uma branch `redesign` criada a partir da `dev`, nos dois repositórios (`cacau-cardapio` e `painel-adm-cacau`).
- Nada de push. A `dev`, o staging e a produção continuam como estão.
- Banco de dados: nenhuma alteração. Rodando local, as telas leem o staging como hoje.
- O que muda é só a aparência. Regras de negócio, consultas ao Supabase, preços, estoque, Lover e permissões continuam iguais. As pastas `domain`, `application` e `infrastructure` não são tocadas, exceto onde algum cálculo novo de relatório for necessário (veja "Fora do escopo").
- Mesmas bibliotecas de hoje: Tailwind 4, Radix (no painel), lucide, recharts, dnd-kit, sonner. Só entram as fontes novas, carregadas do Google Fonts.
- Um commit por etapa, para dar pra voltar qualquer pedaço com facilidade.

## Etapa 0: preparar

1. Conferir que a `dev` está limpa e atualizada nos dois repositórios.
2. Criar a branch `redesign` em cada um.
3. Rodar os testes atuais (`pnpm test` e `pnpm build`) para ter a linha de base. Tudo que passar hoje precisa continuar passando no final.

## Etapa 1: base visual

Nos dois apps, no `src/index.css` (o bloco `@theme` do Tailwind) e no `index.html`:

- Fontes: Bricolage Grotesque para títulos e Figtree para o texto.
- Cardápio, tema escuro: fundo chocolate `#1b110e`, destaque caramelo `#e8a75c`, superfícies, texto e bordas conforme o design system "Splash Pedidos".
- Painel, tema claro: fundo `#f7f3f0`, menu `#efe8e2`, primária `#2a1a14`, perigo `#a3322a`, texto secundário `#76675e`.
- Cantos arredondados (12, 16, 20 e 24 px), espaçamentos, números com largura fixa nos preços e foco visível pelo teclado.
- O painel tem componentes base em `src/presentation/ui` (Button, Input, Select, Dialog, Switch, Checkbox, Combobox, DropdownMenu, Textarea). Eles ganham o visual novo primeiro, e assim todas as telas que os usam já mudam junto.
- O cardápio não tem pasta de componentes base. Vou criar uma pequena (botão, campo, etiqueta de preço, barra fixa inferior) em `src/presentation/shared`, para não repetir estilo em cada tela.

## Etapa 2: cardápio (foco no celular, 390 px)

Uma tela por commit, seguindo o canvas:

| Tela no canvas | Arquivo atual |
|---|---|
| 1 · Entrada da loja | `order/OrderTypeSelectionPage.tsx` |
| 2 · Cardápio (lista com miniatura, categorias, promoções) | `menu/MenuPage.tsx`, `ProductCard.tsx`, `CategoryPillBar.tsx`, `PromotionCarousel.tsx` |
| 3 e 4 · Produto em etapas (tamanho, depois cobertura e adicionais) | `menu/ProductDetailModal.tsx`, `VariationGroupSection.tsx`, `AddonGroupSection.tsx`, `PromotionDetailModal.tsx` |
| 5 · Sacola | `cart/CartPage.tsx` |
| 6 · Seus dados | `customer/IdentificationPage.tsx` |
| 7 · Confirmar | `order/ReviewPage.tsx` |
| 8 · Acompanhamento (linha do tempo) | `order/OrderTrackingView.tsx` |
| 9 · Meus pedidos | `order/OrdersPage.tsx` |
| 10 · Entrada pela mesa | `order/TableEntryPage.tsx` |
| 11 · Revenda | `order/ResellerEntryPage.tsx` |
| Estrutura comum | `shared/PageShell.tsx`, `shared/FixedBottomBar.tsx`, `store/StoreLayout.tsx` |

Detalhes:

- O produto passa de janela única para etapas em tela cheia, com "Voltar" e "Continuar". A lógica de escolha (obrigatórios, mínimos e máximos, preço somado) continua a mesma de hoje.
- O fechamento já é em três páginas (sacola, dados, revisão). Elas ganham o indicador de etapa "1 de 3" e o novo visual.
- O cliente não vê nenhum aviso de Cacau Lover.
- Em telas maiores, o cardápio fica centralizado com largura máxima de celular. Não vou criar um layout separado para computador.

## Etapa 3: painel (computador, 1280 px)

1. Menu lateral (`layout/AppLayout.tsx`, `StoreSwitcher.tsx`, `UserMenu.tsx`): itens no topo e, no rodapé, a unidade com o seletor, uma linha divisória e o nome com o cargo. No celular vira um menu que abre por cima.
2. Entrar (`auth/LoginPage.tsx`) e primeiro administrador (`admin/SetupFirstAdminPage.tsx`).
3. Pedidos (`order/OrderDashboardPage.tsx`, `OrderCard.tsx`, `TableGroupCard.tsx`, `TableSessionSummaryBar.tsx`, avisos de conexão e notificação), com o card completo escolhido.
4. Janelas: aceitar (`attendant/AcceptOrderModal.tsx`), editar itens (`order/OrderItemsEditModal.tsx`), cancelar (`order/CancelOrderModal.tsx`), Lover (`order/FinalizeLoverModal.tsx`), detalhes (`OrderDetailsDrawer.tsx`).
5. Histórico (`order/OrderHistoryPage.tsx`).
6. Produtos, editar produto, organizar cardápio e importar planilha (`product/...`).
7. Promoções e a janela de promoção (`promotion/...`).
8. Atendentes, revendedores, usuários e criar loja.
9. Configurações (`settings/SettingsPage.tsx`).
10. Relatórios (`report/ReportsPage.tsx`): novo visual nos números e gráficos que já existem.

Telas que existem no sistema mas não foram desenhadas no canvas: categorias, grupos de adicionais e grupos de variações (com as janelas de cada um), copiar catálogo e editar perfil de administrador. Elas seguem o mesmo padrão das telas de lista e das janelas já desenhadas.

O cupom impresso e a folha de QR das mesas não mudam, porque dependem do formato da impressora.

## Etapa 4: conferir

- `pnpm build`, `pnpm lint` e `pnpm test` nos dois apps, sem erros.
- Os testes E2E procuram botões e textos na tela. Onde o texto mudou, atualizo o teste junto. Eles rodam só contra o staging, como sempre.
- Passar por todas as telas no navegador local: celular (390 px) no cardápio, computador e celular no painel, navegação só pelo teclado e contraste de cores.
- Tirar prints de cada tela e montar uma página de comparação "antes e depois" para você revisar.

## Fora do escopo (fica para depois, com sua decisão)

- Foto, endereço e horário da loja na entrada do cardápio: precisam de campos novos no banco. Enquanto não houver migration, a entrada mostra o nome da loja e esconde o que ainda não existe.
- Relatórios novos (% Lover, mais vendidos, comparação com a semana anterior): precisam de cálculo novo. Na primeira versão, os relatórios mostram com o visual novo só o que já existe hoje. Os novos cálculos entram em uma etapa separada.
- Junção na `dev`, push e produção: só depois que você aprovar o resultado local.

## O que você recebe no final

- As duas branches `redesign` prontas, com um commit por etapa.
- A página de comparação com os prints.
- Uma lista curta do que ficou diferente do canvas e por quê.

## Resultado (2026-10-12)

Feito nas branches locais `redesign` dos dois repositórios, sem push.

- Painel: base visual, menu lateral (unidade e usuário no rodapé), login e primeiro acesso, quadro de pedidos, janelas de aceitar, cancelar, Cacau Lover e detalhes, abas do catálogo e todas as outras telas com a paleta e os textos novos.
- Cardápio: entrada da loja e da mesa, lista com miniatura e abas, produto em etapas, sacola, seus dados, confirmar, acompanhamento em linha do tempo, meus pedidos e revenda.
- Testes: unitários, lint e build limpos nos dois apps. E2E no staging: cardápio 5/5, painel 4/4 (ajustados aos textos novos).

Diferenças em relação ao canvas:

- Quadro de pedidos com 5 colunas (Novos, Em preparo, Prontos, Entregues, Finalizados) em vez de 4: a coluna Finalizados continua existindo e a tela rola na horizontal quando não cabe.
- Sem "preparo médio" no topo do quadro e sem horário em cada etapa do acompanhamento: o painel e a função `get_order_status` não trazem esses dados hoje.
- Entrada da loja sem foto, endereço e horário (dependem da migration que ficou fora do escopo). No lugar da foto, blocos nas cores da marca.
- Produto em etapas sem "Sem cobertura extra": como adicional é opcional, basta seguir sem marcar nada.
- Janelas de editar itens, editar produto e editar promoção ganharam a paleta nova, mas mantêm o layout antigo.
