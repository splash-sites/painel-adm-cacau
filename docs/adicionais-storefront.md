# Adicionais e variações de produto — contrato pro storefront

Já dá pra ler tudo com a anon key, sem precisar de login (RLS liberado hoje).

## Tabelas
```
addon_groups          (id, store_id, name, active)
addon_options          (id, group_id, name, price, active)
product_addon_groups   (product_id, addon_group_id, selection_type: 'single'|'multiple', max_quantity int|null, sort_order int)
order_item_addons      (id, order_item_id, addon_option_id, name, price, quantity)
```
`product_addon_groups` é o vínculo — é ali que mora se aquele grupo, **naquele produto específico**, é escolha única ou múltipla, se tem limite de quantidade (`max_quantity: null` = sem limite) e a **ordem de exibição** (`sort_order`, por produto — 2 produtos podem ordenar os mesmos grupos diferente, é escolhido por drag-and-drop no admin). Single/multiple e sort_order variam por produto, não pelo grupo.

## Query pra buscar os adicionais de um produto (já ordenado)
```sql
select
  pag.selection_type,
  pag.max_quantity,
  ag.id as group_id,
  ag.name as group_name,
  ao.id as option_id,
  ao.name as option_name,
  ao.price as option_price
from product_addon_groups pag
join addon_groups ag on ag.id = pag.addon_group_id
join addon_options ao on ao.group_id = ag.id
where pag.product_id = :productId
  and ag.active
  and ao.active
order by pag.sort_order
```
Renderiza as seções na ordem que a query devolve — não reordena por conta própria (ex: alfabético), a ordem já vem certa do `sort_order`.

## Como exibir
- Cada grupo vinculado vira uma seção no card do produto (ex: título "Adicionais Waffle").
- `selection_type = 'single'` → radio (só 1 opção marcada por vez).
- `selection_type = 'multiple'` → checkbox (várias opções marcáveis).
- `max_quantity` limita a **soma das quantidades** escolhidas nesse grupo — `null` = sem limite. Em `single`, ainda pode ter seletor de quantidade daquela 1 opção (ex: "2x banana extra"), capado por `max_quantity`.
- Preço de cada opção do lado do nome (ex: "+ R$ 3,00").
- Produto sem nenhum `product_addon_groups` vinculado → não mostra seção nenhuma. Adicional é sempre opcional, nunca obrigatório.

## Regra de cálculo de preço (importante — afeta o total exibido no carrinho)
Adicional sempre **soma** em cima do preço base, por unidade do produto na linha. Variação **depende do `price_mode` do grupo** (novo campo, ver seção de variações abaixo) — pode somar ou **substituir** o preço base inteiro. Fórmula geral:
```
preço efetivo da unidade = variação(ões) 'replace' escolhida(s) substituem o preço base
                            (se nenhuma 'replace' escolhida, preço efetivo = preço base do produto)
                          + variação(ões) 'additive' escolhida(s) somadas em cima
total do item = (preço efetivo da unidade + adicionais por unidade) × quantidade do produto
```
Exemplos reais:
- `2x Capuccino (R$8) + 1x adicional Morango (R$9)` (sem variação) = `(8 + 9) × 2 = R$34`, **não** `16 + 9 = R$25`.
- `1x Capuccino (R$8) + variação "Grande" (grupo price_mode='replace', R$15)` = `R$15`, **não** `R$8 + R$15 = R$23` — a variação substituiu o preço base.
- `1x Capuccino (R$8) + variação "Grande" (replace, R$15) + variação "Intensidade: Forte" (additive, R$0)` = `R$15 + R$0 = R$15`.

Se o carrinho do storefront calcular diferente disso, o total mostrado ao cliente diverge do que o admin registra — implementa a mesma fórmula dos dois lados.

## Variações de produto (diferente de adicional — leia com atenção)
Variação **não é opcional** — é parte de definir o que o produto é (ex: café precisa de intensidade fraco/médio/forte; fondue precisa de sabor **e** de fruta ao mesmo tempo; tamanho P/M/G). Se o produto tem um grupo de variação vinculado, o cliente é **obrigado** a escolher 1 opção daquele grupo antes de adicionar ao carrinho — sem essa trava, o `confirm_order` vai rejeitar.

Diferenças-chave vs adicional:
- Sempre obrigatório (não tem toggle de opcional).
- Sempre single-select (radio, nunca checkbox) — não existe `selection_type` pra configurar, já é sempre assim.
- Sem quantidade por opção — é 1 escolha por dimensão, não "2x sabor chocolate".
- **`price_mode` do grupo decide como o preço da opção se combina com o preço base** (campo novo, configurado 1 vez na criação do grupo, vale pra todo produto que usar aquele grupo):
  - `'additive'` — soma em cima do preço base (0 = neutro, ex: "Intensidade": fraco/médio/forte sem mudar valor).
  - `'replace'` — a opção escolhida **substitui** o preço base inteiro (ex: "Tamanho": Grande custa R$15 fixo, ignora o preço base do produto). Se 2 grupos `'replace'` estiverem vinculados ao mesmo produto (raro), soma as duas opções escolhidas em vez de preço base.

**Tabelas:**
```
variation_groups          (id, store_id, name, active, price_mode: 'additive'|'replace')
variation_options         (id, group_id, name, price, active)
product_variation_groups  (product_id, variation_group_id, sort_order int)  -- vínculo, sort_order por produto (drag-and-drop no admin)
order_item_variations     (id, order_item_id, variation_option_id, name, price, price_mode)  -- snapshot, sem quantity
```
`price_mode` também é gravado (snapshot) em `order_item_variations` no momento do pedido — nunca reconsultar `variation_groups.price_mode` ao vivo depois, senão mudar o modo do grupo reescreve o preço de pedido antigo já feito.

**Query pra buscar as variações de um produto (já ordenada):**
```sql
select
  vg.id as group_id,
  vg.name as group_name,
  vg.price_mode as group_price_mode,
  vo.id as option_id,
  vo.name as option_name,
  vo.price as option_price
from product_variation_groups pvg
join variation_groups vg on vg.id = pvg.variation_group_id
join variation_options vo on vo.group_id = vg.id
where pvg.product_id = :productId
  and vg.active
  and vo.active
order by pvg.sort_order
```
Renderiza as seções (grupo "Sabor" antes de "Fruta", ou o que a loja escolheu no admin) na ordem que a query devolve.
Um produto pode ter **vários grupos de variação ao mesmo tempo** (fondue = grupo "Sabor" + grupo "Fruta") — cada `group_id` diferente na query acima é uma seção obrigatória separada. Produto sem nenhum `product_variation_groups` vinculado não tem variação nenhuma, segue direto.

**Como exibir:** cada `group_id` vira uma seção com radio button (nunca checkbox), 1 opção sempre pré-selecionada ou obrigando escolha antes de habilitar "adicionar ao carrinho" — nunca deixar seguir com uma variação obrigatória sem resposta. Preço ao lado da opção: se `group_price_mode = 'replace'`, mostra o valor cheio da opção (ex: "Grande — R$15,00"); se `'additive'`, mostra como delta só quando != 0 (ex: "Chocolate especial (+R$2,00)"), sem nada quando é 0.

## O que mandar no `confirm_order`
Por item do pedido, mandar adicionais **e** variações juntos (dimensões independentes, mesmo item):
```json
{
  "product_id": "...",
  "quantity": 2,
  "addons": [
    { "addon_option_id": "...", "quantity": 1 }
  ],
  "variations": [
    { "variation_option_id": "..." }
  ]
}
```
`variations` precisa ter exatamente 1 entrada por `variation_group_id` vinculado ao produto — nenhuma entrada a mais, nenhuma faltando, sem `quantity` (implícito 1).

O RPC (a implementar do lado do banco) grava adicionais em `order_item_addons` e variações em `order_item_variations`, ambos fazendo **snapshot** de `name`/`price` no momento do pedido — nunca referenciar `addon_options`/`variation_options` ao vivo depois (preço muda depois, pedido antigo não muda). Validação de single/multiple/`max_quantity` (adicional) e de "exatamente 1 por grupo obrigatório" (variação) precisa ser reforçada no RPC, não só no client.

Um item pode trazer adicionais de **mais de um grupo** vinculado ao produto no mesmo array `addons` — não precisa separar a chamada por grupo, o RPC agrupa internamente (ver rascunho abaixo).

### Rascunho de referência (validação + insert dentro do `confirm_order`)
Não é o RPC final — é o esqueleto da parte de adicionais, pra encaixar dentro do `confirm_order` que já existe (que já cuida de criar `orders`/`order_items`). Pressupõe `v_order_item_id` (a `order_item` recém-criada) e `p_product_id`/`p_addons` (jsonb, o array do payload acima) disponíveis no escopo:

```sql
declare
  v_group  record;
  v_addon  jsonb;
  v_option record;
begin
  if p_addons is null or jsonb_array_length(p_addons) = 0 then
    return; -- adicional é sempre opcional
  end if;

  -- valida grupo por grupo (agrupando o array flat pelo group_id de cada opção)
  for v_group in
    select
      ao.group_id,
      pag.selection_type,
      pag.max_quantity,
      count(*) as option_count,
      sum((addon->>'quantity')::int) as total_quantity
    from jsonb_array_elements(p_addons) as addon
    join addon_options ao on ao.id = (addon->>'addon_option_id')::uuid and ao.active
    join product_addon_groups pag
      on pag.product_id = p_product_id
     and pag.addon_group_id = ao.group_id
    group by ao.group_id, pag.selection_type, pag.max_quantity
  loop
    if v_group.selection_type = 'single' and v_group.option_count > 1 then
      raise exception 'Grupo % aceita só 1 opção por vez (selection_type single)', v_group.group_id;
    end if;

    if v_group.max_quantity is not null and v_group.total_quantity > v_group.max_quantity then
      raise exception 'Quantidade % excede o limite % do grupo %',
        v_group.total_quantity, v_group.max_quantity, v_group.group_id;
    end if;
  end loop;

  -- passou na validação de todos os grupos — grava o snapshot
  for v_addon in select * from jsonb_array_elements(p_addons)
  loop
    select ao.name, ao.price into v_option
    from addon_options ao
    where ao.id = (v_addon->>'addon_option_id')::uuid and ao.active;

    insert into order_item_addons (order_item_id, addon_option_id, name, price, quantity)
    values (
      v_order_item_id,
      (v_addon->>'addon_option_id')::uuid,
      v_option.name,
      v_option.price,
      (v_addon->>'quantity')::int
    );
  end loop;
end;
```

### Rascunho de referência — validação + insert de variações dentro do `confirm_order`
Mesma ideia do rascunho de adicionais acima, mas pra `p_variations` (jsonb, array `[{ "variation_option_id": "..." }]`). A regra aqui é mais rígida: **todo** grupo vinculado ao produto precisa aparecer exatamente 1 vez. `price_mode` é lido do grupo e gravado como snapshot junto (nunca fica só no admin).

```sql
declare
  v_required_count int;
  v_provided_count int;
  v_variation jsonb;
  v_option    record;
begin
  select count(*) into v_required_count
  from product_variation_groups
  where product_id = p_product_id;

  if v_required_count = 0 then
    return; -- produto sem variação obrigatória, nada a validar
  end if;

  -- conta quantas variações mandadas realmente pertencem a um grupo vinculado ao produto,
  -- sem repetir grupo (distinct em group_id)
  select count(distinct vo.group_id) into v_provided_count
  from jsonb_array_elements(p_variations) as variation
  join variation_options vo on vo.id = (variation->>'variation_option_id')::uuid and vo.active
  join product_variation_groups pvg
    on pvg.product_id = p_product_id
   and pvg.variation_group_id = vo.group_id;

  if coalesce(jsonb_array_length(p_variations), 0) <> v_required_count
     or v_provided_count <> v_required_count then
    raise exception 'Produto % precisa de exatamente % variação(ões), 1 por grupo vinculado', p_product_id, v_required_count;
  end if;

  for v_variation in select * from jsonb_array_elements(p_variations)
  loop
    select vo.name, vo.price, vg.price_mode into v_option
    from variation_options vo
    join variation_groups vg on vg.id = vo.group_id
    where vo.id = (v_variation->>'variation_option_id')::uuid and vo.active;

    insert into order_item_variations (order_item_id, variation_option_id, name, price, price_mode)
    values (
      v_order_item_id,
      (v_variation->>'variation_option_id')::uuid,
      v_option.name,
      v_option.price,
      v_option.price_mode
    );
  end loop;
end;
```

### Como calcular o preço final do item ao gravar (ou exibir no carrinho)
```sql
-- v_replace_total: soma das opções escolhidas cujo grupo tem price_mode='replace' (0 se nenhuma)
-- v_additive_total: soma das opções escolhidas cujo grupo tem price_mode='additive'
-- preço efetivo da unidade = (v_replace_total > 0 ? v_replace_total : preço_base_do_produto) + v_additive_total
-- total do item = preço efetivo da unidade × quantidade + adicionais_por_unidade × quantidade
```
Mesma lógica que o admin usa pra exibir o total no dashboard — mantém os dois lados calculando igual.

## Preço Lover (fora do escopo de adicionais, mas travava a implementação)
Não existe regra de "quem é lover" — sem flag de assinatura/fidelidade em `profiles`, sem lógica de gating nenhuma. Decisão: **mostrar os dois valores pra todo mundo**, sempre — `price` e `lover_price` lado a lado no card do produto, sem checar login nem role.

Ação pendente: confirmar se a view `public_products` já expõe `lover_price` (ela precisa expor todas as colunas de `products` exceto `cost_price`/`external_code` — se `lover_price` ficou de fora por engano, é 1 linha de `alter view`/recriar a view).

## Já resolvido (não precisa se preocupar)
Leitura pública (sem login) das tabelas de config de adicionais **e** de variações já está liberada via RLS, escopada a `active = true`. Grupo/opção/vínculo inativo já some sozinho das queries acima.
