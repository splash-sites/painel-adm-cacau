-- Duas coisas, nessa ordem (a segunda se apoia na primeira):
--
-- A) Uma convenção só pra order_items.unit_price: preço da unidade JÁ COM as variações
--    (e com o desconto do combo, quando é combo). Era o que confirm_order gravava;
--    add_order_item (painel) gravava o preço do produto sem variação, e o painel somava
--    as variações por cima em todos os itens — errando os do cardápio (variação 'replace'
--    em combo perdia o desconto; 'additive' com preço contaria duas vezes).
--
-- B) Cacau Lover no fechamento (decidido 2026-10-11): o pedido congela também o preço
--    Lover (item, variação, adicional); ao finalizar, o painel pergunta se o cliente é
--    Lover (orders.is_lover) e os Relatórios somam pelo preço que valeu.

-- ============================================================================
-- Colunas (todas opcionais: retrocompatível com o código em produção)
-- ============================================================================
alter table public.orders add column is_lover boolean;
alter table public.order_items add column lover_unit_price numeric;
alter table public.order_item_variations add column lover_price numeric;
alter table public.order_item_addons add column lover_price numeric;

comment on column public.orders.is_lover is 'Cliente é Cacau Lover? Perguntado pelo painel ao finalizar. null = não perguntado (vale o preço normal).';
comment on column public.order_items.lover_unit_price is 'Preço Lover da unidade, congelado (mesma convenção do unit_price: com variações e desconto de combo). null = pedido anterior ao Lover (vale unit_price).';

-- ============================================================================
-- Snapshot do preço Lover de variação e adicional, na hora em que entram no pedido
-- (cobre confirm_order, add_order_item e update_order_item sem mexer neles).
-- ============================================================================
create or replace function public.order_item_variations_lover_trg()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.lover_price is null and new.variation_option_id is not null then
    select coalesce(vo.lover_price, vo.price) into new.lover_price
    from variation_options vo where vo.id = new.variation_option_id;
  end if;
  return new;
end;
$$;

create trigger order_item_variations_lover
before insert on public.order_item_variations
for each row execute function public.order_item_variations_lover_trg();

create or replace function public.order_item_addons_lover_trg()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.lover_price is null and new.addon_option_id is not null then
    select coalesce(ao.lover_price, ao.price) into new.lover_price
    from addon_options ao where ao.id = new.addon_option_id;
  end if;
  return new;
end;
$$;

create trigger order_item_addons_lover
before insert on public.order_item_addons
for each row execute function public.order_item_addons_lover_trg();

-- ============================================================================
-- Preço da unidade pelo catálogo atual (normal e Lover) — mesma regra do confirm_order:
-- soma das 'replace' > 0 substitui o preço do produto; 'additive' soma em cima.
-- Lover vazio = mesmo preço.
-- ============================================================================
create or replace function public.catalog_unit_prices(p_product_id uuid, p_variation_option_ids uuid[],
  out regular numeric, out lover numeric)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_price numeric;
  v_lover numeric;
  v_replace numeric;
  v_replace_lover numeric;
  v_additive numeric;
  v_additive_lover numeric;
begin
  select p.price, coalesce(p.lover_price, p.price) into v_price, v_lover
  from products p where p.id = p_product_id;

  select
    coalesce(sum(vo.price) filter (where vg.price_mode = 'replace'), 0),
    coalesce(sum(coalesce(vo.lover_price, vo.price)) filter (where vg.price_mode = 'replace'), 0),
    coalesce(sum(vo.price) filter (where vg.price_mode = 'additive'), 0),
    coalesce(sum(coalesce(vo.lover_price, vo.price)) filter (where vg.price_mode = 'additive'), 0)
  into v_replace, v_replace_lover, v_additive, v_additive_lover
  from variation_options vo
  join variation_groups vg on vg.id = vo.group_id
  where vo.id = any(coalesce(p_variation_option_ids, '{}'::uuid[])) and vo.active;

  if v_replace > 0 then
    regular := v_replace + v_additive;
    lover := v_replace_lover + v_additive_lover;
  else
    regular := v_price + v_additive;
    lover := v_lover + v_additive_lover;
  end if;
end;
$$;

revoke all on function public.catalog_unit_prices(uuid, uuid[]) from public, anon;

-- Preço Lover base (sem desconto de combo) de um item já gravado, pelo snapshot das variações.
create or replace function public.order_item_lover_base(p_item_id uuid)
returns numeric
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select
    case
      when coalesce(sum(v.price) filter (where v.price_mode = 'replace'), 0) > 0
        then coalesce(sum(coalesce(v.lover_price, v.price)) filter (where v.price_mode = 'replace'), 0)
      else (select coalesce(p.lover_price, p.price) from order_items oi join products p on p.id = oi.product_id where oi.id = p_item_id)
    end
    + coalesce(sum(coalesce(v.lover_price, v.price)) filter (where v.price_mode = 'additive'), 0)
  from order_item_variations v
  where v.order_item_id = p_item_id;
$$;

revoke all on function public.order_item_lover_base(uuid) from public, anon, authenticated;

-- ============================================================================
-- Congela lover_unit_price dos itens do pedido que ainda não têm.
-- Combo: mesmo desconto da promoção aplicado sobre o Lover, com a mesma distribuição
-- de centavos do confirm_order (por produto, desempate por product_id).
-- ============================================================================
create or replace function public.order_freeze_lover_prices(p_order_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_promotion_id uuid;
  v_promo record;
  v_base_total numeric;
  v_discounted_total numeric;
  v_ratio numeric;
  v_target_cents bigint;
begin
  update order_items oi
     set lover_unit_price = order_item_lover_base(oi.id)
   where oi.order_id = p_order_id
     and oi.lover_unit_price is null
     and oi.promotion_id is null;

  for v_promotion_id in
    select distinct promotion_id from order_items
    where order_id = p_order_id and promotion_id is not null and lover_unit_price is null
  loop
    select discount_type, discount_value into v_promo from promotions where id = v_promotion_id;

    select coalesce(sum(order_item_lover_base(id) * quantity), 0) into v_base_total
    from order_items where order_id = p_order_id and promotion_id = v_promotion_id;

    if v_promo.discount_type = 'percent' then
      v_discounted_total := greatest(0, v_base_total * (1 - v_promo.discount_value / 100));
    elsif v_promo.discount_type = 'fixed_amount' then
      v_discounted_total := greatest(0, v_base_total - v_promo.discount_value);
    else
      v_discounted_total := v_base_total;
    end if;

    v_ratio := case when v_base_total > 0 then v_discounted_total / v_base_total else 0 end;
    v_target_cents := round(v_discounted_total * 100);

    with lines as (
      select product_id, sum(quantity) as qty, sum(order_item_lover_base(id) * quantity) as line_base
      from order_items
      where order_id = p_order_id and promotion_id = v_promotion_id
      group by product_id
    ),
    floored as (
      select product_id, qty,
        line_base * v_ratio * 100 as ideal_cents,
        floor(line_base * v_ratio * 100) as floor_cents
      from lines
    ),
    ranked as (
      select product_id, qty, floor_cents,
        row_number() over (order by (ideal_cents - floor_cents) desc, product_id asc) as rnk,
        sum(floor_cents) over () as total_floor_cents
      from floored
    )
    update order_items oi
       set lover_unit_price = case when r.qty > 0 then
             (r.floor_cents + case when r.rnk <= (v_target_cents - r.total_floor_cents) then 1 else 0 end) / 100.0 / r.qty
           else 0 end
      from ranked r
     where oi.order_id = p_order_id
       and oi.promotion_id = v_promotion_id
       and oi.product_id = r.product_id;
  end loop;
end;
$$;

revoke all on function public.order_freeze_lover_prices(uuid) from public, anon, authenticated;

-- confirm_order grava variações/adicionais depois do item: o cálculo roda no fim da
-- transação (constraint trigger adiado), quando o pedido já está completo.
create or replace function public.order_items_freeze_lover_trg()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if exists (select 1 from order_items where id = new.id and lover_unit_price is null) then
    perform order_freeze_lover_prices(new.order_id);
  end if;
  return null;
end;
$$;

revoke all on function public.order_items_freeze_lover_trg() from public, anon, authenticated;

create constraint trigger order_items_freeze_lover
after insert on public.order_items
deferrable initially deferred
for each row execute function public.order_items_freeze_lover_trg();

-- ============================================================================
-- add_order_item / update_order_item (painel): preço com variação, normal e Lover.
-- Mesma assinatura (create or replace substitui, não cria versão nova).
-- ============================================================================
create or replace function public.add_order_item(p_order_id uuid, p_product_id uuid, p_quantity integer, p_variation_option_ids uuid[] DEFAULT '{}'::uuid[], p_addons jsonb DEFAULT '[]'::jsonb) RETURNS void
    LANGUAGE plpgsql
    AS $$
declare
  v_status text;
  v_store_id uuid;
  v_prices record;
  v_item_id uuid;
  v_required_groups int;
  v_selected_groups int;
  v_addon jsonb;
begin
  select status, store_id into v_status, v_store_id from orders where id = p_order_id;
  if not found then
    raise exception 'Pedido não encontrado';
  end if;
  if v_status <> 'received' then
    raise exception 'Só é possível editar itens enquanto o pedido está recebido';
  end if;
  if p_quantity < 1 then
    raise exception 'Quantidade precisa ser maior que zero';
  end if;

  if not exists (select 1 from products where id = p_product_id and store_id = v_store_id) then
    raise exception 'Produto não encontrado';
  end if;

  select count(*) into v_required_groups
  from product_variation_groups
  where product_id = p_product_id;

  select count(distinct vg.id) into v_selected_groups
  from variation_options vo
  join variation_groups vg on vg.id = vo.group_id
  join product_variation_groups pvg on pvg.variation_group_id = vg.id and pvg.product_id = p_product_id
  where vo.id = any(p_variation_option_ids) and vo.active;

  if v_required_groups > 0 and (
    v_selected_groups <> v_required_groups
    or coalesce(array_length(p_variation_option_ids, 1), 0) <> v_required_groups
  ) then
    raise exception 'Selecione 1 opção pra cada variação obrigatória do produto';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(p_addons) as sel(item)
    join addon_options ao on ao.id = (sel.item->>'addon_option_id')::uuid
    left join product_addon_groups pag on pag.addon_group_id = ao.group_id and pag.product_id = p_product_id
    where pag.product_id is null
  ) then
    raise exception 'Adicional não pertence a esse produto';
  end if;

  if exists (
    select pag.addon_group_id
    from jsonb_array_elements(p_addons) as sel(item)
    join addon_options ao on ao.id = (sel.item->>'addon_option_id')::uuid
    join product_addon_groups pag on pag.addon_group_id = ao.group_id and pag.product_id = p_product_id
    group by pag.addon_group_id, pag.selection_type, pag.max_quantity
    having
      (pag.selection_type = 'single' and count(*) > 1)
      or (pag.max_quantity is not null and sum(greatest((sel.item->>'quantity')::int, 1)) > pag.max_quantity)
  ) then
    raise exception 'Seleção de adicional inválida pra esse produto';
  end if;

  select * into v_prices from catalog_unit_prices(p_product_id, p_variation_option_ids);

  insert into order_items (order_id, product_id, quantity, unit_price, lover_unit_price)
  values (p_order_id, p_product_id, p_quantity, v_prices.regular, v_prices.lover)
  returning id into v_item_id;

  insert into order_item_variations (order_item_id, variation_option_id, name, price, price_mode)
  select v_item_id, vo.id, vo.name, vo.price, vg.price_mode
  from variation_options vo
  join variation_groups vg on vg.id = vo.group_id
  where vo.id = any(p_variation_option_ids);

  for v_addon in select * from jsonb_array_elements(p_addons)
  loop
    insert into order_item_addons (order_item_id, addon_option_id, name, price, quantity)
    select v_item_id, ao.id, ao.name, ao.price, greatest((v_addon->>'quantity')::int, 1)
    from addon_options ao
    where ao.id = (v_addon->>'addon_option_id')::uuid and ao.active;
  end loop;
end;
$$;

create or replace function public.update_order_item(p_item_id uuid, p_quantity integer, p_variation_option_ids uuid[] DEFAULT '{}'::uuid[], p_addons jsonb DEFAULT '[]'::jsonb) RETURNS void
    LANGUAGE plpgsql
    AS $$
declare
  v_status text;
  v_product_id uuid;
  v_promotion_id uuid;
  v_required_groups int;
  v_selected_groups int;
  v_addon jsonb;
  v_variations_changed boolean;
  v_prices record;
begin
  if p_quantity < 1 then
    raise exception 'Quantidade precisa ser maior que zero';
  end if;

  select o.status, oi.product_id, oi.promotion_id into v_status, v_product_id, v_promotion_id
  from order_items oi
  join orders o on o.id = oi.order_id
  where oi.id = p_item_id;

  if not found then
    raise exception 'Item não encontrado';
  end if;
  if v_status <> 'received' then
    raise exception 'Só é possível editar itens enquanto o pedido está recebido';
  end if;

  select count(*) into v_required_groups
  from product_variation_groups
  where product_id = v_product_id;

  select count(distinct vg.id) into v_selected_groups
  from variation_options vo
  join variation_groups vg on vg.id = vo.group_id
  where vo.id = any(p_variation_option_ids) and vo.active;

  if v_required_groups > 0 and (
    v_selected_groups <> v_required_groups
    or coalesce(array_length(p_variation_option_ids, 1), 0) <> v_required_groups
  ) then
    raise exception 'Selecione 1 opção pra cada variação obrigatória do produto';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(p_addons) as sel(item)
    join addon_options ao on ao.id = (sel.item->>'addon_option_id')::uuid
    left join product_addon_groups pag on pag.addon_group_id = ao.group_id and pag.product_id = v_product_id
    where pag.product_id is null
  ) then
    raise exception 'Adicional não pertence a esse produto';
  end if;

  if exists (
    select pag.addon_group_id
    from jsonb_array_elements(p_addons) as sel(item)
    join addon_options ao on ao.id = (sel.item->>'addon_option_id')::uuid
    join product_addon_groups pag on pag.addon_group_id = ao.group_id and pag.product_id = v_product_id
    group by pag.addon_group_id, pag.selection_type, pag.max_quantity
    having
      (pag.selection_type = 'single' and count(*) > 1)
      or (pag.max_quantity is not null and sum(greatest((sel.item->>'quantity')::int, 1)) > pag.max_quantity)
  ) then
    raise exception 'Seleção de adicional inválida pra esse produto';
  end if;

  v_variations_changed := coalesce((
    select array_agg(variation_option_id order by variation_option_id)
    from order_item_variations where order_item_id = p_item_id
  ), '{}'::uuid[]) is distinct from coalesce((
    select array_agg(v order by v) from unnest(p_variation_option_ids) as v
  ), '{}'::uuid[]);

  if v_variations_changed then
    -- Preço de item de combo saiu do desconto da promoção; recalcular sozinho perderia o desconto.
    if v_promotion_id is not null then
      raise exception 'Item de combo: pra trocar a variação, remova o item e adicione de novo';
    end if;
    select * into v_prices from catalog_unit_prices(v_product_id, p_variation_option_ids);
    update order_items
       set quantity = p_quantity, unit_price = v_prices.regular, lover_unit_price = v_prices.lover
     where id = p_item_id;
  else
    update order_items set quantity = p_quantity where id = p_item_id;
  end if;

  delete from order_item_variations where order_item_id = p_item_id;
  insert into order_item_variations (order_item_id, variation_option_id, name, price, price_mode)
  select p_item_id, vo.id, vo.name, vo.price, vg.price_mode
  from variation_options vo
  join variation_groups vg on vg.id = vo.group_id
  where vo.id = any(p_variation_option_ids);

  delete from order_item_addons where order_item_id = p_item_id;
  for v_addon in select * from jsonb_array_elements(p_addons)
  loop
    insert into order_item_addons (order_item_id, addon_option_id, name, price, quantity)
    select p_item_id, ao.id, ao.name, ao.price, greatest((v_addon->>'quantity')::int, 1)
    from addon_options ao
    where ao.id = (v_addon->>'addon_option_id')::uuid and ao.active;
  end loop;
end;
$$;

-- ============================================================================
-- Painel marca se o cliente é Lover (ao finalizar). SECURITY INVOKER: o RLS de orders
-- decide (store_admin só a própria loja; anônimo não acha o pedido).
-- ============================================================================
create or replace function public.set_order_lover(p_order_id uuid, p_is_lover boolean)
returns void
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_status text;
begin
  select status into v_status from orders where id = p_order_id;
  if not found then
    raise exception 'Pedido não encontrado';
  end if;
  if v_status = 'cancelled' then
    raise exception 'Pedido cancelado';
  end if;
  update orders set is_lover = p_is_lover, updated_at = now() where id = p_order_id;
end;
$$;

revoke execute on function public.set_order_lover(uuid, boolean) from public, anon;
grant execute on function public.set_order_lover(uuid, boolean) to authenticated;

-- ============================================================================
-- Itens antigos adicionados pelo painel (unit_price sem variação): corrige os que têm
-- variação 'replace' pelo snapshot gravado no próprio item. Item do cardápio já tem
-- unit_price = replace + additive e não muda. Combo nunca veio do painel.
-- ('additive' sem 'replace' não dá pra distinguir; produção tinha 0 com preço > 0.)
-- ============================================================================
update public.order_items oi
   set unit_price = s.replace_sum + s.additive_sum
  from (
    select order_item_id,
      coalesce(sum(price) filter (where price_mode = 'replace'), 0) as replace_sum,
      coalesce(sum(price) filter (where price_mode = 'additive'), 0) as additive_sum
    from public.order_item_variations
    group by order_item_id
  ) s
 where s.order_item_id = oi.id
   and oi.promotion_id is null
   and s.replace_sum > 0
   and oi.unit_price <> s.replace_sum + s.additive_sum;
