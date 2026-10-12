-- Ajustes do security-sweep em 20261011160000 (preço unificado + Cacau Lover), antes da produção:
-- 1) catalog_unit_prices (SECURITY DEFINER) somava qualquer opção de variação recebida — de outro
--    produto ou de outra loja — e respondia preço de qualquer produto pra qualquer logado.
--    Agora só opções vinculadas ao produto, e só produto da loja de quem chama (super_admin: todas).
-- 2) add_order_item/update_order_item: produto sem variação exige lista vazia; update conta só
--    grupos do próprio produto; search_path fixo.
-- 3) set_order_lover: só em pedido "delivered" (o passo antes de finalizar) — não dá mais pra
--    trocar o preço que vale num pedido já finalizado.
-- 4) order_freeze_lover_prices: promoção precisa ser da loja do pedido.

create or replace function public.catalog_unit_prices(p_product_id uuid, p_variation_option_ids uuid[],
  out regular numeric, out lover numeric)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_store_id uuid;
  v_price numeric;
  v_lover numeric;
  v_replace numeric;
  v_replace_lover numeric;
  v_additive numeric;
  v_additive_lover numeric;
begin
  select p.store_id, p.price, coalesce(p.lover_price, p.price) into v_store_id, v_price, v_lover
  from products p where p.id = p_product_id;

  if v_store_id is null or not ("current_role"() = 'super_admin' or v_store_id = current_store_id()) then
    raise exception 'Produto não encontrado';
  end if;

  select
    coalesce(sum(vo.price) filter (where vg.price_mode = 'replace'), 0),
    coalesce(sum(coalesce(vo.lover_price, vo.price)) filter (where vg.price_mode = 'replace'), 0),
    coalesce(sum(vo.price) filter (where vg.price_mode = 'additive'), 0),
    coalesce(sum(coalesce(vo.lover_price, vo.price)) filter (where vg.price_mode = 'additive'), 0)
  into v_replace, v_replace_lover, v_additive, v_additive_lover
  from variation_options vo
  join variation_groups vg on vg.id = vo.group_id
  join product_variation_groups pvg on pvg.variation_group_id = vg.id and pvg.product_id = p_product_id
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

create or replace function public.add_order_item(p_order_id uuid, p_product_id uuid, p_quantity integer, p_variation_option_ids uuid[] DEFAULT '{}'::uuid[], p_addons jsonb DEFAULT '[]'::jsonb) RETURNS void
    LANGUAGE plpgsql
    SET search_path = public, pg_temp
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

  if v_required_groups = 0 and coalesce(array_length(p_variation_option_ids, 1), 0) > 0 then
    raise exception 'Esse produto não tem variação';
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
    SET search_path = public, pg_temp
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
  join product_variation_groups pvg on pvg.variation_group_id = vg.id and pvg.product_id = v_product_id
  where vo.id = any(p_variation_option_ids) and vo.active;

  if v_required_groups > 0 and (
    v_selected_groups <> v_required_groups
    or coalesce(array_length(p_variation_option_ids, 1), 0) <> v_required_groups
  ) then
    raise exception 'Selecione 1 opção pra cada variação obrigatória do produto';
  end if;

  if v_required_groups = 0 and coalesce(array_length(p_variation_option_ids, 1), 0) > 0 then
    raise exception 'Esse produto não tem variação';
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
  if v_status <> 'delivered' then
    raise exception 'Só dá pra marcar Cacau Lover ao finalizar (pedido entregue)';
  end if;
  update orders set is_lover = p_is_lover, updated_at = now() where id = p_order_id;
end;
$$;

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
    select discount_type, discount_value into v_promo from promotions
    where id = v_promotion_id and store_id = (select store_id from orders where id = p_order_id);

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

