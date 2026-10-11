-- Baseline do schema public, extraido da producao em 2026-10-11 (pg_dump --schema-only).
-- Gerado a partir do banco real: e a fonte de verdade do schema daqui pra frente.
-- Ajustes pra aplicar num projeto Supabase novo:
--   * sem CREATE SCHEMA public / ALTER SCHEMA OWNER (ja existem no projeto novo)
--   * sem ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin (so a plataforma pode)
--   * reset de grants no fim pra ficar identico a producao (projeto novo concede a mais por padrao)
--   * buckets, policies de storage, trigger em auth.users e Realtime de orders no fim

--
-- PostgreSQL database dump
--

\restrict 1JsEIseQm1vd9ztDWgI3X0EmrSZ0MU1dn0jAJbgs6OSOfpEw8HEShkJVorPRGW5

-- Dumped from database version 17.6
-- Dumped by pg_dump version 17.11

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: pg_database_owner
--




--
-- Name: add_order_item(uuid, uuid, integer); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.add_order_item(p_order_id uuid, p_product_id uuid, p_quantity integer) RETURNS void
    LANGUAGE plpgsql
    AS $$
declare
  v_status text;
  v_price numeric;
begin
  select status into v_status from orders where id = p_order_id;
  if not found then
    raise exception 'Pedido não encontrado';
  end if;
  if v_status <> 'received' then
    raise exception 'Só é possível editar itens enquanto o pedido está recebido';
  end if;
  if p_quantity < 1 then
    raise exception 'Quantidade precisa ser maior que zero';
  end if;

  select price into v_price from products where id = p_product_id;
  if not found then
    raise exception 'Produto não encontrado';
  end if;

  insert into order_items (order_id, product_id, quantity, unit_price)
  values (p_order_id, p_product_id, p_quantity, v_price);
end;
$$;


ALTER FUNCTION public.add_order_item(p_order_id uuid, p_product_id uuid, p_quantity integer) OWNER TO postgres;

--
-- Name: add_order_item(uuid, uuid, integer, uuid[], jsonb); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.add_order_item(p_order_id uuid, p_product_id uuid, p_quantity integer, p_variation_option_ids uuid[] DEFAULT '{}'::uuid[], p_addons jsonb DEFAULT '[]'::jsonb) RETURNS void
    LANGUAGE plpgsql
    AS $$
declare
  v_status text;
  v_store_id uuid;
  v_price numeric;
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

  select price into v_price from products where id = p_product_id and store_id = v_store_id;
  if not found then
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

  insert into order_items (order_id, product_id, quantity, unit_price)
  values (p_order_id, p_product_id, p_quantity, v_price)
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


ALTER FUNCTION public.add_order_item(p_order_id uuid, p_product_id uuid, p_quantity integer, p_variation_option_ids uuid[], p_addons jsonb) OWNER TO postgres;

--
-- Name: assign_table_session(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.assign_table_session() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare
  v_session_id uuid;
begin
  if new.order_type = 'dine_in' and new.table_number is not null and new.table_session_id is null then
    insert into table_sessions (store_id, table_number, status)
    values (new.store_id, new.table_number, 'open')
    on conflict (store_id, table_number) where status = 'open'
    do update set status = table_sessions.status
    returning id into v_session_id;

    new.table_session_id := v_session_id;
  end if;

  return new;
end;
$$;


ALTER FUNCTION public.assign_table_session() OWNER TO postgres;

--
-- Name: change_order_status(uuid, text, uuid, text); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.change_order_status(p_order_id uuid, p_new_status text, p_attendant_id uuid DEFAULT NULL::uuid, p_reason text DEFAULT NULL::text) RETURNS void
    LANGUAGE plpgsql
    AS $$
declare
  v_status text;
  v_order_type text;
  v_store_id uuid;
  v_allowed text[];
begin
  select status, order_type, store_id into v_status, v_order_type, v_store_id
  from orders
  where id = p_order_id;

  if not found then
    raise exception 'Pedido não encontrado';
  end if;

  if p_new_status = 'cancelled' then
    if v_status <> 'received' then
      raise exception 'Cancelamento só vale enquanto o pedido está recebido (status atual: %)', v_status;
    end if;
  else
    v_allowed := case
      when v_status = 'received' then array['preparing']
      when v_status = 'preparing' and v_order_type = 'dine_in' then array['delivered', 'finalized']
      when v_status = 'preparing' then array['out_for_delivery']
      when v_status = 'out_for_delivery' then array['delivered', 'finalized']
      when v_status = 'delivered' then array['finalized']
      else array[]::text[]
    end;

    if not (p_new_status = any(v_allowed)) then
      raise exception 'Transição de status inválida: % -> % (tipo %)', v_status, p_new_status, v_order_type;
    end if;
  end if;

  if v_status = 'received' and p_new_status = 'preparing' then
    if p_attendant_id is null then
      raise exception 'Atendente obrigatório pra iniciar o preparo';
    end if;

    if not exists (
      select 1 from attendants
      where id = p_attendant_id
        and store_id = v_store_id
        and active
    ) then
      raise exception 'Atendente inválido pra essa loja';
    end if;

    update orders set status = p_new_status, updated_at = now(), attendant_id = p_attendant_id where id = p_order_id;
  elsif p_new_status = 'cancelled' then
    update orders
    set status = p_new_status, updated_at = now(), cancellation_reason = nullif(btrim(p_reason), '')
    where id = p_order_id;
  else
    update orders set status = p_new_status, updated_at = now() where id = p_order_id;
  end if;

  insert into order_status_history (order_id, status, changed_by, changed_at)
  values (p_order_id, p_new_status, auth.uid(), now());
end;
$$;


ALTER FUNCTION public.change_order_status(p_order_id uuid, p_new_status text, p_attendant_id uuid, p_reason text) OWNER TO postgres;

--
-- Name: check_product_category_store(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.check_product_category_store() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
begin
  if new.category_id is not null then
    if not exists (
      select 1 from categories
      where id = new.category_id and store_id = new.store_id
    ) then
      raise exception 'category_id não pertence à mesma loja do produto';
    end if;
  end if;
  return new;
end;
$$;


ALTER FUNCTION public.check_product_category_store() OWNER TO postgres;

--
-- Name: close_table_session(uuid); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.close_table_session(p_session_id uuid) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare
  v_store_id uuid;
  v_caller_role text;
  v_caller_store_id uuid;
  v_open_orders int;
begin
  select store_id into v_store_id from table_sessions where id = p_session_id and status = 'open';
  if v_store_id is null then
    raise exception 'Comanda não encontrada ou já fechada.';
  end if;

  select role, store_id into v_caller_role, v_caller_store_id from profiles where id = auth.uid();

  if v_caller_role is distinct from 'super_admin' and
     (v_caller_role is distinct from 'store_admin' or v_caller_store_id is distinct from v_store_id) then
    raise exception 'Sem permissão pra fechar essa comanda.';
  end if;

  select count(*) into v_open_orders
  from orders
  where table_session_id = p_session_id and status not in ('finalized', 'cancelled');

  if v_open_orders > 0 then
    raise exception 'Ainda tem pedido em aberto nessa mesa — finalize ou cancele antes de fechar a comanda.';
  end if;

  update table_sessions set status = 'closed', closed_at = now() where id = p_session_id;
end;
$$;


ALTER FUNCTION public.close_table_session(p_session_id uuid) OWNER TO postgres;

--
-- Name: confirm_order(uuid, text, text, text, text, jsonb, jsonb, text, text); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.confirm_order(p_store_id uuid, p_order_type text, p_customer_name text, p_customer_cpf text, p_customer_phone text, p_delivery_address jsonb, p_items jsonb, p_table_number text DEFAULT NULL::text, p_sales_channel text DEFAULT 'retail'::text) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare
  v_order_id uuid;
  v_item jsonb;
  v_price numeric;
  v_store_active boolean;
  v_reseller_enabled boolean;
  v_product_id uuid;
  v_order_item_id uuid;
  v_addons jsonb;
  v_group record;
  v_addon jsonb;
  v_option record;
  v_variations jsonb;
  v_required_variation_groups int;
  v_provided_variation_groups int;
  v_variation jsonb;
  v_variation_option record;
  v_replace_sum numeric;
  v_additive_sum numeric;
  v_promotion_id uuid;
  v_track_stock boolean;
  v_stock_quantity int;
begin
  if p_order_type not in ('dine_in', 'pickup', 'delivery') then
    raise exception 'Tipo de pedido inválido: %', p_order_type;
  end if;

  if p_sales_channel not in ('retail', 'reseller') then
    raise exception 'Canal de venda inválido: %', p_sales_channel;
  end if;

  if p_sales_channel = 'reseller' and p_order_type = 'dine_in' then
    raise exception 'Pedido de revendedor não pode ser do tipo dine_in';
  end if;

  select active, reseller_enabled into v_store_active, v_reseller_enabled
  from stores where id = p_store_id;

  if v_store_active is not true then
    raise exception 'Loja indisponível';
  end if;

  if p_sales_channel = 'reseller' and v_reseller_enabled is not true then
    raise exception 'Loja não atende revendedores';
  end if;

  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'Carrinho vazio';
  end if;

  if exists (
    select 1 from jsonb_array_elements(p_items) as item
    where coalesce((item->>'quantity')::int, 0) <= 0
  ) then
    raise exception 'Quantidade inválida: todo item precisa de quantidade maior que zero';
  end if;

  insert into orders (store_id, order_type, status, sales_channel, customer_name, customer_cpf, customer_phone, delivery_address, table_number)
  values (p_store_id, p_order_type, 'received', p_sales_channel, p_customer_name, p_customer_cpf, p_customer_phone, p_delivery_address, p_table_number)
  returning id into v_order_id;

  create temporary table combo_item_prices (
    id serial primary key,
    promotion_id uuid not null,
    product_id uuid not null,
    quantity int not null,
    unit_price numeric not null
  ) on commit drop;

  for v_promotion_id in
    select distinct (item->>'promotion_id')::uuid
    from jsonb_array_elements(p_items) as item
    where item->>'promotion_id' is not null
  loop
    declare
      v_promo record;
      v_expected jsonb;
      v_provided jsonb;
      v_combo_n int;
      v_base_total numeric := 0;
      v_discounted_total numeric;
      v_ratio numeric;
      v_key text;
      v_base_qty int;
      v_prov_qty int;
      v_live_price numeric;
      v_target_cents bigint;
      v_combo_track_stock boolean;
      v_combo_stock_quantity int;
    begin
      select id, product_id, discount_type, discount_value into v_promo
      from promotions
      where id = v_promotion_id and store_id = p_store_id and active = true;

      if v_promo.id is null then
        raise exception 'Promoção inválida ou de outra loja: %', v_promotion_id;
      end if;

      select coalesce(jsonb_object_agg(product_id::text, quantity), '{}'::jsonb)
        || jsonb_build_object(v_promo.product_id::text, 1)
      into v_expected
      from promotion_combo_items
      where promotion_id = v_promotion_id;

      select coalesce(jsonb_object_agg(product_id, total_qty), '{}'::jsonb)
      into v_provided
      from (
        select item->>'product_id' as product_id, sum((item->>'quantity')::int) as total_qty
        from jsonb_array_elements(p_items) as item
        where (item->>'promotion_id')::uuid = v_promotion_id
        group by item->>'product_id'
      ) grouped;

      if (select count(*) from jsonb_object_keys(v_provided)) <> (select count(*) from jsonb_object_keys(v_expected)) then
        raise exception 'Combo % com composição inválida (produto a mais ou faltando)', v_promotion_id;
      end if;

      v_combo_n := null;
      for v_key in select jsonb_object_keys(v_expected) loop
        v_base_qty := (v_expected->>v_key)::int;
        v_prov_qty := (v_provided->>v_key)::int;
        if v_prov_qty is null or v_base_qty is null or v_base_qty = 0 or v_prov_qty % v_base_qty <> 0 then
          raise exception 'Combo % com quantidade inválida pro produto %', v_promotion_id, v_key;
        end if;
        if v_combo_n is null then
          v_combo_n := v_prov_qty / v_base_qty;
        elsif v_combo_n <> v_prov_qty / v_base_qty then
          raise exception 'Combo % com quantidades inconsistentes entre os produtos do combo', v_promotion_id;
        end if;
      end loop;

      if v_combo_n is null or v_combo_n < 1 then
        raise exception 'Combo % com quantidade inválida', v_promotion_id;
      end if;

      for v_key in select jsonb_object_keys(v_expected) loop
        select price, track_stock, stock_quantity
        into v_live_price, v_combo_track_stock, v_combo_stock_quantity
        from products
        where id = v_key::uuid
          and store_id = p_store_id
          and active = true
          and (p_sales_channel <> 'reseller' or available_reseller);

        if v_live_price is null then
          raise exception 'Produto % do combo indisponível', v_key;
        end if;

        -- estoque normal: só varejo (revendedor tem estoque próprio, controlado por trigger)
        if p_sales_channel = 'retail' and v_combo_track_stock and coalesce(v_combo_stock_quantity, 0) <= 0 then
          raise exception 'Produto % do combo sem estoque', v_key;
        end if;

        declare
          v_item_variations jsonb;
          v_combo_replace_sum numeric;
          v_combo_additive_sum numeric;
        begin
          select item->'variations' into v_item_variations
          from jsonb_array_elements(p_items) as item
          where (item->>'promotion_id')::uuid = v_promotion_id
            and item->>'product_id' = v_key
          limit 1;

          if v_item_variations is not null and jsonb_array_length(v_item_variations) > 0 then
            select
              coalesce(sum(vo.price) filter (where vg.price_mode = 'replace'), 0),
              coalesce(sum(vo.price) filter (where vg.price_mode = 'additive'), 0)
            into v_combo_replace_sum, v_combo_additive_sum
            from jsonb_array_elements(v_item_variations) as variation
            join variation_options vo on vo.id = (variation->>'variation_option_id')::uuid and vo.active
            join variation_groups vg on vg.id = vo.group_id
            join product_variation_groups pvg
              on pvg.product_id = v_key::uuid
             and pvg.variation_group_id = vo.group_id;

            if v_combo_replace_sum > 0 then
              v_live_price := v_combo_replace_sum;
            end if;
            v_live_price := v_live_price + v_combo_additive_sum;
          end if;
        end;

        v_prov_qty := (v_provided->>v_key)::int;
        v_base_total := v_base_total + (v_live_price * v_prov_qty);
        insert into combo_item_prices (promotion_id, product_id, quantity, unit_price)
        values (v_promotion_id, v_key::uuid, v_prov_qty, v_live_price);
      end loop;

      if v_promo.discount_type = 'percent' then
        v_discounted_total := greatest(0, v_base_total * (1 - v_promo.discount_value / 100));
      elsif v_promo.discount_type = 'fixed_amount' then
        v_discounted_total := greatest(0, v_base_total - v_promo.discount_value);
      else
        v_discounted_total := v_base_total;
      end if;

      v_ratio := case when v_base_total > 0 then v_discounted_total / v_base_total else 0 end;
      v_target_cents := round(v_discounted_total * 100);

      with floored as (
        select
          cip.id,
          cip.unit_price * cip.quantity * v_ratio * 100 as ideal_cents,
          floor(cip.unit_price * cip.quantity * v_ratio * 100) as floor_cents
        from combo_item_prices cip
        where cip.promotion_id = v_promotion_id
      ),
      ranked as (
        select
          id,
          floor_cents,
          row_number() over (order by (ideal_cents - floor_cents) desc, id asc) as rnk,
          sum(floor_cents) over () as total_floor_cents
        from floored
      )
      update combo_item_prices cip
      set unit_price = (
        (r.floor_cents + case when r.rnk <= (v_target_cents - r.total_floor_cents) then 1 else 0 end)
        / 100.0 / cip.quantity
      )
      from ranked r
      where cip.id = r.id;
    end;
  end loop;

  -- Ordem por product_id: toda transação toma os locks de products (via trigger de estoque do
  -- revendedor) na mesma ordem, então dois pedidos simultâneos nunca se travam mutuamente.
  for v_item in
    select value from jsonb_array_elements(p_items) order by value->>'product_id'
  loop
    v_product_id := (v_item->>'product_id')::uuid;

    if v_item->>'promotion_id' is not null then
      select unit_price into v_price
      from combo_item_prices
      where promotion_id = (v_item->>'promotion_id')::uuid
        and product_id = v_product_id;

      if v_price is null then
        raise exception 'Preço de combo não calculado pro produto %', v_product_id;
      end if;
      -- disponibilidade e estoque do item de combo já foram checados no pré-passo acima
    else
      select price, track_stock, stock_quantity into v_price, v_track_stock, v_stock_quantity
      from products
      where id = v_product_id
        and store_id = p_store_id
        and active = true
        and (p_sales_channel <> 'reseller' or available_reseller);

      if v_price is null then
        raise exception 'Produto indisponível: %', v_item->>'product_id';
      end if;

      -- estoque normal: só varejo (revendedor tem estoque próprio, controlado por trigger)
      if p_sales_channel = 'retail' and v_track_stock and coalesce(v_stock_quantity, 0) <= 0 then
        raise exception 'Produto sem estoque: %', v_product_id;
      end if;
    end if;

    v_variations := v_item->'variations';

    select count(*) into v_required_variation_groups
    from product_variation_groups
    where product_id = v_product_id;

    if v_required_variation_groups > 0 then
      select count(distinct vo.group_id) into v_provided_variation_groups
      from jsonb_array_elements(coalesce(v_variations, '[]'::jsonb)) as variation
      join variation_options vo on vo.id = (variation->>'variation_option_id')::uuid and vo.active
      join product_variation_groups pvg
        on pvg.product_id = v_product_id
       and pvg.variation_group_id = vo.group_id;

      if coalesce(jsonb_array_length(v_variations), 0) <> v_required_variation_groups
         or coalesce(v_provided_variation_groups, 0) <> v_required_variation_groups then
        raise exception 'Produto % precisa de exatamente % variação(ões), 1 por grupo vinculado', v_product_id, v_required_variation_groups;
      end if;

      if v_item->>'promotion_id' is null then
        select
          coalesce(sum(vo.price) filter (where vg.price_mode = 'replace'), 0),
          coalesce(sum(vo.price) filter (where vg.price_mode = 'additive'), 0)
        into v_replace_sum, v_additive_sum
        from jsonb_array_elements(v_variations) as variation
        join variation_options vo on vo.id = (variation->>'variation_option_id')::uuid and vo.active
        join variation_groups vg on vg.id = vo.group_id
        join product_variation_groups pvg
          on pvg.product_id = v_product_id
         and pvg.variation_group_id = vo.group_id;

        if v_replace_sum > 0 then
          v_price := v_replace_sum;
        end if;
        v_price := v_price + v_additive_sum;
      end if;
    end if;

    insert into order_items (order_id, product_id, quantity, unit_price, notes, promotion_id)
    values (v_order_id, v_product_id, (v_item->>'quantity')::int, v_price, v_item->>'note', (v_item->>'promotion_id')::uuid)
    returning id into v_order_item_id;

    if v_required_variation_groups > 0 then
      for v_variation in select * from jsonb_array_elements(v_variations)
      loop
        select vo.name, vo.price, vg.price_mode into v_variation_option
        from variation_options vo
        join variation_groups vg on vg.id = vo.group_id
        join product_variation_groups pvg
          on pvg.product_id = v_product_id
         and pvg.variation_group_id = vo.group_id
        where vo.id = (v_variation->>'variation_option_id')::uuid
          and vo.active;

        insert into order_item_variations (order_item_id, variation_option_id, name, price, price_mode)
        values (
          v_order_item_id,
          (v_variation->>'variation_option_id')::uuid,
          v_variation_option.name,
          v_variation_option.price,
          v_variation_option.price_mode
        );
      end loop;
    end if;

    v_addons := v_item->'addons';

    if v_addons is not null and jsonb_array_length(v_addons) > 0 then
      for v_group in
        select
          ao.group_id,
          pag.selection_type,
          pag.max_quantity,
          count(*) as option_count,
          sum(coalesce((addon->>'quantity')::int, 1)) as total_quantity
        from jsonb_array_elements(v_addons) as addon
        join addon_options ao on ao.id = (addon->>'addon_option_id')::uuid and ao.active
        join product_addon_groups pag
          on pag.product_id = v_product_id
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

      for v_addon in select * from jsonb_array_elements(v_addons)
      loop
        select ao.name, ao.price into v_option
        from addon_options ao
        join product_addon_groups pag
          on pag.product_id = v_product_id
         and pag.addon_group_id = ao.group_id
        where ao.id = (v_addon->>'addon_option_id')::uuid
          and ao.active;

        if v_option.name is null then
          raise exception 'Adicional inválido pra esse produto: %', v_addon->>'addon_option_id';
        end if;

        insert into order_item_addons (order_item_id, addon_option_id, name, price, quantity)
        values (
          v_order_item_id,
          (v_addon->>'addon_option_id')::uuid,
          v_option.name,
          v_option.price,
          coalesce((v_addon->>'quantity')::int, 1)
        );
      end loop;
    end if;
  end loop;

  return v_order_id;
end;
$$;


ALTER FUNCTION public.confirm_order(p_store_id uuid, p_order_type text, p_customer_name text, p_customer_cpf text, p_customer_phone text, p_delivery_address jsonb, p_items jsonb, p_table_number text, p_sales_channel text) OWNER TO postgres;

--
-- Name: copy_catalog(uuid, uuid, uuid, boolean, boolean); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.copy_catalog(p_actor uuid, p_from_store uuid, p_to_store uuid, p_update_existing boolean DEFAULT false, p_dry_run boolean DEFAULT false) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    SET statement_timeout TO '180s'
    AS $$
declare
  v_role         text;
  v_created      int := 0;
  v_updated      int := 0;
  v_skipped      int := 0;
  v_image_count  int := 0;
  v_images       jsonb := '[]'::jsonb;
  r_prod         record;
  r_pag          record;
  r_pvg          record;
  v_exists       boolean;
  v_from_cat     text;
  v_to_cat_id    uuid;
  v_to_prod_id   uuid;
  v_to_group_id  uuid;
  v_to_image_url text;
  v_cur_img      text;
  v_local_pat    text;
begin
  v_local_pat := '%/product-images/' || p_to_store::text || '/%';

  select role into v_role from profiles where id = p_actor;
  if v_role is distinct from 'super_admin' then
    raise exception 'Apenas super_admin pode copiar catálogo' using errcode = '42501';
  end if;
  if p_from_store = p_to_store then
    raise exception 'Origem e destino não podem ser a mesma loja' using errcode = '22023';
  end if;

  if not p_dry_run then
    perform pg_advisory_xact_lock(hashtext(p_to_store::text));
  end if;

  for r_prod in select * from products where store_id = p_from_store loop
    select exists(
      select 1 from products
      where store_id = p_to_store and external_code = r_prod.external_code
    ) into v_exists;

    if v_exists and not p_update_existing then
      v_skipped := v_skipped + 1;
      continue;
    end if;

    v_from_cat  := (select name from categories where id = r_prod.category_id);
    v_to_cat_id := null;
    if v_from_cat is not null then
      select id into v_to_cat_id
      from categories
      where store_id = p_to_store and lower(trim(name)) = lower(trim(v_from_cat))
      limit 1;
      if v_to_cat_id is null and not p_dry_run then
        insert into categories (store_id, name, active, sort_order)
        select p_to_store, name, active,
               coalesce((select max(sort_order) + 1 from categories where store_id = p_to_store), 0)
        from categories where id = r_prod.category_id
        returning id into v_to_cat_id;
      end if;
    end if;

    if p_dry_run then
      if v_exists then v_updated := v_updated + 1; else v_created := v_created + 1; end if;
      if r_prod.image_url is not null and r_prod.image_url <> '' then
        if not v_exists then
          v_image_count := v_image_count + 1;
        else
          select image_url into v_cur_img
          from products where store_id = p_to_store and external_code = r_prod.external_code;
          if v_cur_img is null or v_cur_img not like v_local_pat then
            v_image_count := v_image_count + 1;
          end if;
        end if;
      end if;
      continue;
    end if;

    insert into products (
      store_id, external_code, name, ncm, unit, category, category_id, description,
      image_url, stock_quantity, cost_price, price, lover_price, sort_order, active, track_stock,
      available_dine_in, available_pickup, available_delivery, available_reseller
    ) values (
      p_to_store, r_prod.external_code, r_prod.name, r_prod.ncm, r_prod.unit,
      v_from_cat, v_to_cat_id, r_prod.description,
      r_prod.image_url,
      0, r_prod.cost_price, r_prod.price, r_prod.lover_price, r_prod.sort_order, r_prod.active,
      false,
      r_prod.available_dine_in, r_prod.available_pickup, r_prod.available_delivery, r_prod.available_reseller
    )
    on conflict (store_id, external_code) do update set
      name        = excluded.name,
      ncm         = excluded.ncm,
      unit        = excluded.unit,
      category    = excluded.category,
      category_id = excluded.category_id,
      description = excluded.description,
      cost_price  = excluded.cost_price,
      price       = excluded.price,
      lover_price = excluded.lover_price,
      sort_order  = excluded.sort_order,
      active      = excluded.active
    returning id, image_url into v_to_prod_id, v_to_image_url;

    if v_exists then v_updated := v_updated + 1; else v_created := v_created + 1; end if;

    if r_prod.image_url is not null and r_prod.image_url <> ''
       and (v_to_image_url is null or v_to_image_url not like v_local_pat) then
      v_image_count := v_image_count + 1;
      v_images := v_images || jsonb_build_object('product_id', v_to_prod_id, 'source_url', r_prod.image_url);
    end if;

    for r_pag in
      select pag.*, ag.name as g_name, ag.active as g_active
      from product_addon_groups pag
      join addon_groups ag on ag.id = pag.addon_group_id
      where pag.product_id = r_prod.id
    loop
      select id into v_to_group_id
      from addon_groups
      where store_id = p_to_store and lower(trim(name)) = lower(trim(r_pag.g_name))
      limit 1;
      if v_to_group_id is null then
        insert into addon_groups (store_id, name, active, sort_order)
        values (p_to_store, r_pag.g_name, r_pag.g_active,
                coalesce((select max(sort_order) + 1 from addon_groups where store_id = p_to_store), 0))
        returning id into v_to_group_id;
      end if;

      insert into addon_options (group_id, name, price, lover_price, active, sort_order)
      select v_to_group_id, ao.name, ao.price, ao.lover_price, ao.active, ao.sort_order
      from addon_options ao
      where ao.group_id = r_pag.addon_group_id
        and not exists (
          select 1 from addon_options x
          where x.group_id = v_to_group_id and lower(trim(x.name)) = lower(trim(ao.name))
        );

      insert into product_addon_groups (product_id, addon_group_id, selection_type, max_quantity, sort_order)
      values (v_to_prod_id, v_to_group_id, r_pag.selection_type, r_pag.max_quantity, r_pag.sort_order)
      on conflict (product_id, addon_group_id) do update set
        selection_type = excluded.selection_type,
        max_quantity   = excluded.max_quantity,
        sort_order     = excluded.sort_order;
    end loop;

    for r_pvg in
      select pvg.*, vg.name as g_name, vg.active as g_active, vg.price_mode as g_price_mode
      from product_variation_groups pvg
      join variation_groups vg on vg.id = pvg.variation_group_id
      where pvg.product_id = r_prod.id
    loop
      select id into v_to_group_id
      from variation_groups
      where store_id = p_to_store and lower(trim(name)) = lower(trim(r_pvg.g_name))
      limit 1;
      if v_to_group_id is null then
        insert into variation_groups (store_id, name, active, price_mode, sort_order)
        values (p_to_store, r_pvg.g_name, r_pvg.g_active, r_pvg.g_price_mode,
                coalesce((select max(sort_order) + 1 from variation_groups where store_id = p_to_store), 0))
        returning id into v_to_group_id;
      end if;

      insert into variation_options (group_id, name, price, lover_price, active, sort_order)
      select v_to_group_id, vo.name, vo.price, vo.lover_price, vo.active, vo.sort_order
      from variation_options vo
      where vo.group_id = r_pvg.variation_group_id
        and not exists (
          select 1 from variation_options x
          where x.group_id = v_to_group_id and lower(trim(x.name)) = lower(trim(vo.name))
        );

      insert into product_variation_groups (product_id, variation_group_id, sort_order)
      values (v_to_prod_id, v_to_group_id, r_pvg.sort_order)
      on conflict (product_id, variation_group_id) do update set
        sort_order = excluded.sort_order;
    end loop;
  end loop;

  if not p_dry_run then
    insert into catalog_copy_log (actor_id, from_store, to_store, update_existing,
                                  created_count, updated_count, skipped_count, image_count)
    values (p_actor, p_from_store, p_to_store, p_update_existing,
            v_created, v_updated, v_skipped, v_image_count);
  end if;

  return jsonb_build_object(
    'dry_run',     p_dry_run,
    'created',     v_created,
    'updated',     v_updated,
    'skipped',     v_skipped,
    'image_count', v_image_count,
    'images',      v_images
  );
end;
$$;


ALTER FUNCTION public.copy_catalog(p_actor uuid, p_from_store uuid, p_to_store uuid, p_update_existing boolean, p_dry_run boolean) OWNER TO postgres;

--
-- Name: current_role(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public."current_role"() RETURNS text
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  select role from profiles where id = auth.uid()
$$;


ALTER FUNCTION public."current_role"() OWNER TO postgres;

--
-- Name: current_store_id(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.current_store_id() RETURNS uuid
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  select store_id from profiles where id = auth.uid()
$$;


ALTER FUNCTION public.current_store_id() OWNER TO postgres;

--
-- Name: get_order_status(uuid, text); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.get_order_status(p_order_id uuid, p_customer_cpf text) RETURNS text
    LANGUAGE sql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  select status from orders
  where id = p_order_id and customer_cpf = p_customer_cpf;
$$;


ALTER FUNCTION public.get_order_status(p_order_id uuid, p_customer_cpf text) OWNER TO postgres;

--
-- Name: handle_new_user(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.handle_new_user() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
begin
  insert into public.profiles (id, role, full_name)
  values (new.id, 'customer', new.raw_user_meta_data->>'full_name');
  return new;
end;
$$;


ALTER FUNCTION public.handle_new_user() OWNER TO postgres;

--
-- Name: list_orders_by_cpf(uuid, text); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.list_orders_by_cpf(p_store_id uuid, p_customer_cpf text) RETURNS TABLE(id uuid, order_type text, status text, table_number text, created_at timestamp with time zone, items jsonb)
    LANGUAGE sql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  select
    o.id,
    o.order_type,
    o.status,
    o.table_number,
    o.created_at,
    (
      select jsonb_agg(jsonb_build_object(
        'product_name', p.name,
        'quantity', oi.quantity,
        'unit_price', oi.unit_price,
        'note', oi.notes
      ) order by oi.id)
      from order_items oi
      join products p on p.id = oi.product_id
      where oi.order_id = o.id
    ) as items
  from orders o
  where o.store_id = p_store_id
    and o.customer_cpf = p_customer_cpf
  order by o.created_at desc;
$$;


ALTER FUNCTION public.list_orders_by_cpf(p_store_id uuid, p_customer_cpf text) OWNER TO postgres;

--
-- Name: order_items_reseller_stock_trg(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.order_items_reseller_stock_trg() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare
  v_channel text;
  v_status  text;
  v_store   uuid;
begin
  if tg_op = 'INSERT' then
    select sales_channel, status, store_id into v_channel, v_status, v_store from orders where id = new.order_id;
    if v_channel = 'reseller' and v_status <> 'cancelled' then
      -- quantidade <= 0 viraria delta positivo e SOMARIA no saldo
      if new.quantity <= 0 then
        raise exception 'Quantidade do item deve ser maior que zero' using errcode = 'P0001';
      end if;
      perform reseller_stock_apply(new.product_id, v_store, -new.quantity);
    end if;
    return new;
  end if;

  if tg_op = 'UPDATE' then
    if new.quantity is distinct from old.quantity then
      select sales_channel, status, store_id into v_channel, v_status, v_store from orders where id = new.order_id;
      if v_channel = 'reseller' and v_status <> 'cancelled' then
        if new.quantity <= 0 then
          raise exception 'Quantidade do item deve ser maior que zero' using errcode = 'P0001';
        end if;
        perform reseller_stock_apply(new.product_id, v_store, old.quantity - new.quantity);
      end if;
    end if;
    return new;
  end if;

  -- DELETE
  select sales_channel, status, store_id into v_channel, v_status, v_store from orders where id = old.order_id;
  if found and v_channel = 'reseller' and v_status <> 'cancelled' then
    perform reseller_stock_apply(old.product_id, v_store, old.quantity);
  end if;
  return old;
end;
$$;


ALTER FUNCTION public.order_items_reseller_stock_trg() OWNER TO postgres;

--
-- Name: orders_reseller_stock_restore_trg(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.orders_reseller_stock_restore_trg() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare
  r record;
begin
  for r in
    select product_id, sum(quantity) as qty
      from order_items
     where order_id = new.id
     group by product_id
     order by product_id
  loop
    perform reseller_stock_apply(r.product_id, new.store_id, r.qty);
  end loop;
  return new;
end;
$$;


ALTER FUNCTION public.orders_reseller_stock_restore_trg() OWNER TO postgres;

--
-- Name: remove_order_item(uuid); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.remove_order_item(p_item_id uuid) RETURNS void
    LANGUAGE plpgsql
    AS $$
declare
  v_status text;
  v_order_id uuid;
  v_item_count int;
begin
  select o.status, oi.order_id into v_status, v_order_id
  from order_items oi
  join orders o on o.id = oi.order_id
  where oi.id = p_item_id;

  if not found then
    raise exception 'Item não encontrado';
  end if;
  if v_status <> 'received' then
    raise exception 'Só é possível editar itens enquanto o pedido está recebido';
  end if;

  select count(*) into v_item_count from order_items where order_id = v_order_id;
  if v_item_count <= 1 then
    raise exception 'Pedido precisa ter pelo menos 1 item — cancele o pedido em vez de remover o último item';
  end if;

  delete from order_item_addons where order_item_id = p_item_id;
  delete from order_item_variations where order_item_id = p_item_id;
  delete from order_items where id = p_item_id;
end;
$$;


ALTER FUNCTION public.remove_order_item(p_item_id uuid) OWNER TO postgres;

--
-- Name: reseller_stock_apply(uuid, uuid, numeric); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.reseller_stock_apply(p_product_id uuid, p_store_id uuid, p_delta numeric) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare
  v_rows int;
  v_name text;
begin
  if p_delta = 0 then
    return;
  end if;

  -- O produto tem que ser da loja do pedido: como esta função roda como owner (sem RLS),
  -- sem essa checagem um pedido da loja A com product_id da loja B baixaria o saldo da B.
  if not exists (select 1 from products where id = p_product_id and store_id = p_store_id) then
    raise exception 'Produto não pertence à loja do pedido' using errcode = 'P0001';
  end if;

  if p_delta > 0 then
    update products
       set reseller_stock_quantity = reseller_stock_quantity + p_delta
     where id = p_product_id
       and store_id = p_store_id
       and reseller_track_stock;
    return;
  end if;

  update products
     set reseller_stock_quantity = reseller_stock_quantity + p_delta
   where id = p_product_id
     and store_id = p_store_id
     and reseller_track_stock
     and reseller_stock_quantity >= -p_delta;
  get diagnostics v_rows = row_count;

  if v_rows = 0 then
    select name into v_name from products where id = p_product_id and store_id = p_store_id and reseller_track_stock;
    if found then
      raise exception 'Estoque de revendedor insuficiente para "%"', v_name
        using errcode = 'P0001';
    end if;
    -- produto sem controle de estoque: nada a baixar
  end if;
end;
$$;


ALTER FUNCTION public.reseller_stock_apply(p_product_id uuid, p_store_id uuid, p_delta numeric) OWNER TO postgres;

--
-- Name: revert_order_status(uuid); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.revert_order_status(p_order_id uuid) RETURNS void
    LANGUAGE plpgsql
    AS $$
declare
  v_status text;
  v_order_type text;
  v_previous text;
begin
  select status, order_type into v_status, v_order_type from orders where id = p_order_id;
  if not found then
    raise exception 'Pedido não encontrado';
  end if;

  v_previous := case
    when v_status = 'preparing' then 'received'
    when v_status = 'out_for_delivery' then 'preparing'
    when v_status = 'delivered' and v_order_type = 'dine_in' then 'preparing'
    when v_status = 'delivered' then 'out_for_delivery'
    else null
  end;

  if v_previous is null then
    raise exception 'Não é possível voltar a partir do status atual: %', v_status;
  end if;

  if v_previous = 'received' then
    update orders set status = v_previous, updated_at = now(), attendant_id = null where id = p_order_id;
  else
    update orders set status = v_previous, updated_at = now() where id = p_order_id;
  end if;

  insert into order_status_history (order_id, status, changed_by, changed_at)
  values (p_order_id, v_previous, auth.uid(), now());
end;
$$;


ALTER FUNCTION public.revert_order_status(p_order_id uuid) OWNER TO postgres;

--
-- Name: rls_auto_enable(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.rls_auto_enable() RETURNS event_trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'pg_catalog'
    AS $$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN
    SELECT *
    FROM pg_event_trigger_ddl_commands()
    WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      AND object_type IN ('table','partitioned table')
  LOOP
     IF cmd.schema_name IS NOT NULL AND cmd.schema_name IN ('public') AND cmd.schema_name NOT IN ('pg_catalog','information_schema') AND cmd.schema_name NOT LIKE 'pg_toast%' AND cmd.schema_name NOT LIKE 'pg_temp%' THEN
      BEGIN
        EXECUTE format('alter table if exists %s enable row level security', cmd.object_identity);
        RAISE LOG 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE LOG 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
      END;
     ELSE
        RAISE LOG 'rls_auto_enable: skip % (either system schema or not in enforced list: %.)', cmd.object_identity, cmd.schema_name;
     END IF;
  END LOOP;
END;
$$;


ALTER FUNCTION public.rls_auto_enable() OWNER TO postgres;

--
-- Name: sanitize_order_contact_fields(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.sanitize_order_contact_fields() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
begin
  if new.customer_cpf is not null then
    new.customer_cpf := regexp_replace(new.customer_cpf, '[^0-9]', '', 'g');
  end if;
  if new.customer_phone is not null then
    new.customer_phone := regexp_replace(new.customer_phone, '[^0-9]', '', 'g');
  end if;
  return new;
end;
$$;


ALTER FUNCTION public.sanitize_order_contact_fields() OWNER TO postgres;

--
-- Name: set_admin_active(uuid, boolean); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.set_admin_active(p_user_id uuid, p_active boolean) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare
  v_caller_role text;
  v_target_role text;
begin
  select role into v_caller_role from profiles where id = auth.uid();

  if v_caller_role is distinct from 'super_admin' then
    raise exception 'Apenas super_admin pode alterar status de usuário.';
  end if;

  select role into v_target_role from profiles where id = p_user_id;

  if v_target_role is null then
    raise exception 'Usuário não encontrado.';
  end if;

  if v_target_role = 'super_admin' then
    raise exception 'Não é possível alterar o status de um super_admin.';
  end if;

  if p_user_id = auth.uid() then
    raise exception 'Não é possível alterar seu próprio status.';
  end if;

  update profiles set active = p_active where id = p_user_id;
end;
$$;


ALTER FUNCTION public.set_admin_active(p_user_id uuid, p_active boolean) OWNER TO postgres;

--
-- Name: update_order_item(uuid, integer, uuid[], jsonb); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_order_item(p_item_id uuid, p_quantity integer, p_variation_option_ids uuid[] DEFAULT '{}'::uuid[], p_addons jsonb DEFAULT '[]'::jsonb) RETURNS void
    LANGUAGE plpgsql
    AS $$
declare
  v_status text;
  v_product_id uuid;
  v_required_groups int;
  v_selected_groups int;
  v_addon jsonb;
begin
  if p_quantity < 1 then
    raise exception 'Quantidade precisa ser maior que zero';
  end if;

  select o.status, oi.product_id into v_status, v_product_id
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

  update order_items set quantity = p_quantity where id = p_item_id;

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


ALTER FUNCTION public.update_order_item(p_item_id uuid, p_quantity integer, p_variation_option_ids uuid[], p_addons jsonb) OWNER TO postgres;

--
-- Name: update_order_item_quantity(uuid, integer); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_order_item_quantity(p_item_id uuid, p_quantity integer) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare
  v_order_id uuid;
  v_status text;
begin
  if p_quantity < 1 then
    raise exception 'Quantidade precisa ser maior que zero';
  end if;

  select order_id into v_order_id from order_items where id = p_item_id;
  if v_order_id is null then
    raise exception 'Item não encontrado';
  end if;

  select status into v_status from orders where id = v_order_id;
  if v_status <> 'received' then
    raise exception 'Só é possível editar item enquanto o pedido está em Recebido';
  end if;

  update order_items set quantity = p_quantity where id = p_item_id;
end;
$$;


ALTER FUNCTION public.update_order_item_quantity(p_item_id uuid, p_quantity integer) OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: addon_groups; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.addon_groups (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    store_id uuid NOT NULL,
    name text NOT NULL,
    active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL
);


ALTER TABLE public.addon_groups OWNER TO postgres;

--
-- Name: addon_options; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.addon_options (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    group_id uuid NOT NULL,
    name text NOT NULL,
    price numeric NOT NULL,
    active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    lover_price numeric,
    sort_order integer DEFAULT 0 NOT NULL
);


ALTER TABLE public.addon_options OWNER TO postgres;

--
-- Name: attendants; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.attendants (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    store_id uuid NOT NULL,
    name text NOT NULL,
    active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.attendants OWNER TO postgres;

--
-- Name: catalog_copy_log; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.catalog_copy_log (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    actor_id uuid NOT NULL,
    from_store uuid NOT NULL,
    to_store uuid NOT NULL,
    update_existing boolean NOT NULL,
    created_count integer NOT NULL,
    updated_count integer NOT NULL,
    skipped_count integer NOT NULL,
    image_count integer NOT NULL,
    ran_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.catalog_copy_log OWNER TO postgres;

--
-- Name: categories; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.categories (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    store_id uuid NOT NULL,
    name text NOT NULL,
    active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL
);


ALTER TABLE public.categories OWNER TO postgres;

--
-- Name: order_item_addons; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.order_item_addons (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    order_item_id uuid NOT NULL,
    addon_option_id uuid,
    name text NOT NULL,
    price numeric NOT NULL,
    quantity integer NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT order_item_addons_quantity_check CHECK ((quantity > 0))
);


ALTER TABLE public.order_item_addons OWNER TO postgres;

--
-- Name: order_item_variations; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.order_item_variations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    order_item_id uuid NOT NULL,
    variation_option_id uuid,
    name text NOT NULL,
    price numeric NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    price_mode text DEFAULT 'additive'::text NOT NULL,
    CONSTRAINT order_item_variations_price_mode_check CHECK ((price_mode = ANY (ARRAY['additive'::text, 'replace'::text])))
);


ALTER TABLE public.order_item_variations OWNER TO postgres;

--
-- Name: order_items; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.order_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    order_id uuid NOT NULL,
    product_id uuid NOT NULL,
    quantity integer NOT NULL,
    unit_price numeric NOT NULL,
    notes text,
    promotion_id uuid,
    CONSTRAINT order_items_quantity_check CHECK ((quantity > 0))
);


ALTER TABLE public.order_items OWNER TO postgres;

--
-- Name: order_status_history; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.order_status_history (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    order_id uuid NOT NULL,
    status text NOT NULL,
    changed_by uuid,
    changed_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.order_status_history OWNER TO postgres;

--
-- Name: orders; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.orders (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    store_id uuid NOT NULL,
    customer_id uuid,
    order_type text NOT NULL,
    status text DEFAULT 'received'::text NOT NULL,
    sales_channel text DEFAULT 'retail'::text NOT NULL,
    table_number text,
    delivery_address jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    customer_name text,
    customer_cpf text,
    customer_phone text,
    attendant_id uuid,
    cancellation_reason text,
    table_session_id uuid,
    CONSTRAINT orders_order_type_check CHECK ((order_type = ANY (ARRAY['dine_in'::text, 'pickup'::text, 'delivery'::text]))),
    CONSTRAINT orders_sales_channel_check CHECK ((sales_channel = ANY (ARRAY['retail'::text, 'reseller'::text]))),
    CONSTRAINT orders_status_check CHECK ((status = ANY (ARRAY['received'::text, 'preparing'::text, 'out_for_delivery'::text, 'delivered'::text, 'finalized'::text, 'cancelled'::text]))),
    CONSTRAINT reseller_never_dine_in CHECK ((NOT ((sales_channel = 'reseller'::text) AND (order_type = 'dine_in'::text))))
);


ALTER TABLE public.orders OWNER TO postgres;

--
-- Name: product_addon_groups; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.product_addon_groups (
    product_id uuid NOT NULL,
    addon_group_id uuid NOT NULL,
    selection_type text NOT NULL,
    max_quantity integer,
    sort_order integer DEFAULT 0 NOT NULL,
    CONSTRAINT product_addon_groups_max_quantity_check CHECK (((max_quantity IS NULL) OR (max_quantity > 0))),
    CONSTRAINT product_addon_groups_selection_type_check CHECK ((selection_type = ANY (ARRAY['single'::text, 'multiple'::text])))
);


ALTER TABLE public.product_addon_groups OWNER TO postgres;

--
-- Name: product_variation_groups; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.product_variation_groups (
    product_id uuid NOT NULL,
    variation_group_id uuid NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL
);


ALTER TABLE public.product_variation_groups OWNER TO postgres;

--
-- Name: products; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.products (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    store_id uuid NOT NULL,
    external_code text NOT NULL,
    name text NOT NULL,
    ncm text,
    unit text,
    category text,
    description text,
    image_url text,
    stock_quantity numeric DEFAULT 0 NOT NULL,
    cost_price numeric,
    price numeric DEFAULT 0 NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    available_reseller boolean DEFAULT false NOT NULL,
    lover_price numeric DEFAULT 0 NOT NULL,
    track_stock boolean DEFAULT true NOT NULL,
    available_dine_in boolean DEFAULT true NOT NULL,
    available_pickup boolean DEFAULT true NOT NULL,
    available_delivery boolean DEFAULT false NOT NULL,
    category_id uuid,
    reseller_stock_quantity numeric DEFAULT 0 NOT NULL,
    reseller_track_stock boolean DEFAULT false NOT NULL,
    CONSTRAINT products_reseller_stock_quantity_check CHECK ((reseller_stock_quantity >= (0)::numeric))
);


ALTER TABLE public.products OWNER TO postgres;

--
-- Name: profiles; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.profiles (
    id uuid NOT NULL,
    role text DEFAULT 'customer'::text NOT NULL,
    store_id uuid,
    full_name text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    active boolean DEFAULT true NOT NULL,
    email text,
    CONSTRAINT profiles_role_check CHECK ((role = ANY (ARRAY['super_admin'::text, 'store_admin'::text, 'customer'::text]))),
    CONSTRAINT store_admin_requires_store CHECK ((((role = 'store_admin'::text) AND (store_id IS NOT NULL)) OR (role <> 'store_admin'::text)))
);


ALTER TABLE public.profiles OWNER TO postgres;

--
-- Name: promotion_combo_items; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.promotion_combo_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    promotion_id uuid NOT NULL,
    product_id uuid NOT NULL,
    quantity integer DEFAULT 1 NOT NULL,
    CONSTRAINT promotion_combo_items_quantity_check CHECK ((quantity > 0))
);


ALTER TABLE public.promotion_combo_items OWNER TO postgres;

--
-- Name: promotions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.promotions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    store_id uuid NOT NULL,
    title text NOT NULL,
    subtitle text,
    badge_label text,
    image_url text NOT NULL,
    product_id uuid NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    discount_type text,
    discount_value numeric,
    CONSTRAINT promotions_discount_type_check CHECK ((discount_type = ANY (ARRAY['percent'::text, 'fixed_amount'::text]))),
    CONSTRAINT promotions_discount_value_check CHECK (((discount_value IS NULL) OR (discount_value > (0)::numeric)))
);


ALTER TABLE public.promotions OWNER TO postgres;

--
-- Name: public_product_addon_groups; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.public_product_addon_groups AS
 SELECT pag.product_id,
    pag.sort_order,
    pag.selection_type,
    pag.max_quantity,
    ag.id AS group_id,
    ag.name AS group_name,
    COALESCE(( SELECT jsonb_agg(jsonb_build_object('id', ao.id, 'name', ao.name, 'price', ao.price, 'lover_price', ao.lover_price) ORDER BY ao.id) AS jsonb_agg
           FROM public.addon_options ao
          WHERE ((ao.group_id = ag.id) AND (ao.active = true))), '[]'::jsonb) AS options
   FROM (public.product_addon_groups pag
     JOIN public.addon_groups ag ON ((ag.id = pag.addon_group_id)))
  WHERE (ag.active = true);


ALTER VIEW public.public_product_addon_groups OWNER TO postgres;

--
-- Name: variation_groups; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.variation_groups (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    store_id uuid NOT NULL,
    name text NOT NULL,
    active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    price_mode text DEFAULT 'additive'::text NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    CONSTRAINT variation_groups_price_mode_check CHECK ((price_mode = ANY (ARRAY['additive'::text, 'replace'::text])))
);


ALTER TABLE public.variation_groups OWNER TO postgres;

--
-- Name: variation_options; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.variation_options (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    group_id uuid NOT NULL,
    name text NOT NULL,
    price numeric DEFAULT 0 NOT NULL,
    active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    lover_price numeric,
    sort_order integer DEFAULT 0 NOT NULL
);


ALTER TABLE public.variation_options OWNER TO postgres;

--
-- Name: public_product_variation_groups; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.public_product_variation_groups AS
 SELECT pvg.product_id,
    pvg.sort_order,
    vg.id AS group_id,
    vg.name AS group_name,
    vg.price_mode,
    COALESCE(( SELECT jsonb_agg(jsonb_build_object('id', vo.id, 'name', vo.name, 'price', vo.price, 'lover_price', vo.lover_price) ORDER BY vo.id) AS jsonb_agg
           FROM public.variation_options vo
          WHERE ((vo.group_id = vg.id) AND (vo.active = true))), '[]'::jsonb) AS options
   FROM (public.product_variation_groups pvg
     JOIN public.variation_groups vg ON ((vg.id = pvg.variation_group_id)))
  WHERE (vg.active = true);


ALTER VIEW public.public_product_variation_groups OWNER TO postgres;

--
-- Name: public_products; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.public_products AS
 SELECT id,
    store_id,
    name,
    ncm,
    unit,
    category,
    description,
    image_url,
    stock_quantity,
    track_stock,
    price,
    lover_price,
    sort_order,
    active,
    created_at,
    available_dine_in,
    available_pickup,
    available_delivery,
    available_reseller,
    category_id,
        CASE
            WHEN available_reseller THEN reseller_stock_quantity
            ELSE NULL::numeric
        END AS reseller_stock_quantity,
        CASE
            WHEN available_reseller THEN reseller_track_stock
            ELSE NULL::boolean
        END AS reseller_track_stock
   FROM public.products;


ALTER VIEW public.public_products OWNER TO postgres;

--
-- Name: public_promotion_combo_items; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.public_promotion_combo_items AS
 SELECT pci.id,
    pci.promotion_id,
    pci.product_id,
    pci.quantity
   FROM (public.promotion_combo_items pci
     JOIN public.promotions p ON ((p.id = pci.promotion_id)))
  WHERE (p.active = true);


ALTER VIEW public.public_promotion_combo_items OWNER TO postgres;

--
-- Name: public_promotions; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.public_promotions AS
 SELECT id,
    store_id,
    title,
    subtitle,
    badge_label,
    image_url,
    product_id,
    sort_order,
    discount_type,
    discount_value
   FROM public.promotions
  WHERE (active = true);


ALTER VIEW public.public_promotions OWNER TO postgres;

--
-- Name: stores; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.stores (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    slug text NOT NULL,
    active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    supports_dine_in boolean DEFAULT true NOT NULL,
    supports_pickup boolean DEFAULT true NOT NULL,
    supports_delivery boolean DEFAULT false NOT NULL,
    reseller_enabled boolean DEFAULT false NOT NULL,
    whatsapp_number text
);


ALTER TABLE public.stores OWNER TO postgres;

--
-- Name: public_stores; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.public_stores AS
 SELECT id,
    name,
    slug,
    active,
    supports_dine_in,
    supports_pickup,
    supports_delivery,
    reseller_enabled,
    whatsapp_number
   FROM public.stores;


ALTER VIEW public.public_stores OWNER TO postgres;

--
-- Name: table_sessions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.table_sessions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    store_id uuid NOT NULL,
    table_number text NOT NULL,
    status text DEFAULT 'open'::text NOT NULL,
    opened_at timestamp with time zone DEFAULT now() NOT NULL,
    closed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT table_sessions_status_check CHECK ((status = ANY (ARRAY['open'::text, 'closed'::text])))
);


ALTER TABLE public.table_sessions OWNER TO postgres;

--
-- Name: addon_groups addon_groups_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.addon_groups
    ADD CONSTRAINT addon_groups_pkey PRIMARY KEY (id);


--
-- Name: addon_options addon_options_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.addon_options
    ADD CONSTRAINT addon_options_pkey PRIMARY KEY (id);


--
-- Name: attendants attendants_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.attendants
    ADD CONSTRAINT attendants_pkey PRIMARY KEY (id);


--
-- Name: catalog_copy_log catalog_copy_log_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.catalog_copy_log
    ADD CONSTRAINT catalog_copy_log_pkey PRIMARY KEY (id);


--
-- Name: categories categories_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_pkey PRIMARY KEY (id);


--
-- Name: order_item_addons order_item_addons_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.order_item_addons
    ADD CONSTRAINT order_item_addons_pkey PRIMARY KEY (id);


--
-- Name: order_item_variations order_item_variations_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.order_item_variations
    ADD CONSTRAINT order_item_variations_pkey PRIMARY KEY (id);


--
-- Name: order_items order_items_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_pkey PRIMARY KEY (id);


--
-- Name: order_status_history order_status_history_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.order_status_history
    ADD CONSTRAINT order_status_history_pkey PRIMARY KEY (id);


--
-- Name: orders orders_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_pkey PRIMARY KEY (id);


--
-- Name: product_addon_groups product_addon_groups_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.product_addon_groups
    ADD CONSTRAINT product_addon_groups_pkey PRIMARY KEY (product_id, addon_group_id);


--
-- Name: product_variation_groups product_variation_groups_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.product_variation_groups
    ADD CONSTRAINT product_variation_groups_pkey PRIMARY KEY (product_id, variation_group_id);


--
-- Name: products products_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_pkey PRIMARY KEY (id);


--
-- Name: products products_store_id_external_code_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_store_id_external_code_key UNIQUE (store_id, external_code);


--
-- Name: profiles profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);


--
-- Name: promotion_combo_items promotion_combo_items_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.promotion_combo_items
    ADD CONSTRAINT promotion_combo_items_pkey PRIMARY KEY (id);


--
-- Name: promotions promotions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.promotions
    ADD CONSTRAINT promotions_pkey PRIMARY KEY (id);


--
-- Name: stores stores_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stores
    ADD CONSTRAINT stores_pkey PRIMARY KEY (id);


--
-- Name: stores stores_slug_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stores
    ADD CONSTRAINT stores_slug_key UNIQUE (slug);


--
-- Name: table_sessions table_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.table_sessions
    ADD CONSTRAINT table_sessions_pkey PRIMARY KEY (id);


--
-- Name: variation_groups variation_groups_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.variation_groups
    ADD CONSTRAINT variation_groups_pkey PRIMARY KEY (id);


--
-- Name: variation_options variation_options_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.variation_options
    ADD CONSTRAINT variation_options_pkey PRIMARY KEY (id);


--
-- Name: categories_store_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX categories_store_id_idx ON public.categories USING btree (store_id);


--
-- Name: categories_store_sort_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX categories_store_sort_idx ON public.categories USING btree (store_id, sort_order);


--
-- Name: idx_addon_groups_store_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_addon_groups_store_id ON public.addon_groups USING btree (store_id);


--
-- Name: idx_addon_options_group_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_addon_options_group_id ON public.addon_options USING btree (group_id);


--
-- Name: idx_attendants_store_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_attendants_store_id ON public.attendants USING btree (store_id);


--
-- Name: idx_order_item_addons_addon_option_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_order_item_addons_addon_option_id ON public.order_item_addons USING btree (addon_option_id);


--
-- Name: idx_order_item_addons_order_item_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_order_item_addons_order_item_id ON public.order_item_addons USING btree (order_item_id);


--
-- Name: idx_order_item_variations_order_item_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_order_item_variations_order_item_id ON public.order_item_variations USING btree (order_item_id);


--
-- Name: idx_order_item_variations_variation_option_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_order_item_variations_variation_option_id ON public.order_item_variations USING btree (variation_option_id);


--
-- Name: idx_order_items_order_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_order_items_order_id ON public.order_items USING btree (order_id);


--
-- Name: idx_order_status_history_order_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_order_status_history_order_id ON public.order_status_history USING btree (order_id);


--
-- Name: idx_orders_store_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_orders_store_id ON public.orders USING btree (store_id);


--
-- Name: idx_orders_store_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_orders_store_status ON public.orders USING btree (store_id, status);


--
-- Name: idx_product_addon_groups_addon_group_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_product_addon_groups_addon_group_id ON public.product_addon_groups USING btree (addon_group_id);


--
-- Name: idx_product_variation_groups_variation_group_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_product_variation_groups_variation_group_id ON public.product_variation_groups USING btree (variation_group_id);


--
-- Name: idx_products_store_category; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_products_store_category ON public.products USING btree (store_id, category);


--
-- Name: idx_products_store_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_products_store_id ON public.products USING btree (store_id);


--
-- Name: idx_profiles_store_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_profiles_store_id ON public.profiles USING btree (store_id);


--
-- Name: idx_variation_groups_store_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_variation_groups_store_id ON public.variation_groups USING btree (store_id);


--
-- Name: idx_variation_options_group_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_variation_options_group_id ON public.variation_options USING btree (group_id);


--
-- Name: order_items_promotion_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX order_items_promotion_id_idx ON public.order_items USING btree (promotion_id) WHERE (promotion_id IS NOT NULL);


--
-- Name: orders_table_session_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX orders_table_session_id_idx ON public.orders USING btree (table_session_id);


--
-- Name: products_category_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX products_category_id_idx ON public.products USING btree (category_id);


--
-- Name: promotion_combo_items_product_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX promotion_combo_items_product_id_idx ON public.promotion_combo_items USING btree (product_id);


--
-- Name: promotion_combo_items_promotion_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX promotion_combo_items_promotion_id_idx ON public.promotion_combo_items USING btree (promotion_id);


--
-- Name: promotions_store_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX promotions_store_id_idx ON public.promotions USING btree (store_id);


--
-- Name: table_sessions_open_per_table_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX table_sessions_open_per_table_idx ON public.table_sessions USING btree (store_id, table_number) WHERE (status = 'open'::text);


--
-- Name: table_sessions_store_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX table_sessions_store_id_idx ON public.table_sessions USING btree (store_id);


--
-- Name: order_items order_items_reseller_stock; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER order_items_reseller_stock AFTER INSERT OR DELETE OR UPDATE OF quantity ON public.order_items FOR EACH ROW EXECUTE FUNCTION public.order_items_reseller_stock_trg();


--
-- Name: orders orders_assign_table_session; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER orders_assign_table_session BEFORE INSERT ON public.orders FOR EACH ROW EXECUTE FUNCTION public.assign_table_session();


--
-- Name: orders orders_reseller_stock_restore; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER orders_reseller_stock_restore AFTER UPDATE OF status ON public.orders FOR EACH ROW WHEN (((new.status = 'cancelled'::text) AND (old.status <> 'cancelled'::text) AND (new.sales_channel = 'reseller'::text))) EXECUTE FUNCTION public.orders_reseller_stock_restore_trg();


--
-- Name: products products_category_store_check; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER products_category_store_check BEFORE INSERT OR UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.check_product_category_store();


--
-- Name: orders sanitize_order_contact_fields_trigger; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER sanitize_order_contact_fields_trigger BEFORE INSERT OR UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.sanitize_order_contact_fields();


--
-- Name: addon_groups addon_groups_store_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.addon_groups
    ADD CONSTRAINT addon_groups_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE CASCADE;


--
-- Name: addon_options addon_options_group_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.addon_options
    ADD CONSTRAINT addon_options_group_id_fkey FOREIGN KEY (group_id) REFERENCES public.addon_groups(id) ON DELETE CASCADE;


--
-- Name: attendants attendants_store_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.attendants
    ADD CONSTRAINT attendants_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE CASCADE;


--
-- Name: catalog_copy_log catalog_copy_log_actor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.catalog_copy_log
    ADD CONSTRAINT catalog_copy_log_actor_id_fkey FOREIGN KEY (actor_id) REFERENCES public.profiles(id);


--
-- Name: catalog_copy_log catalog_copy_log_from_store_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.catalog_copy_log
    ADD CONSTRAINT catalog_copy_log_from_store_fkey FOREIGN KEY (from_store) REFERENCES public.stores(id);


--
-- Name: catalog_copy_log catalog_copy_log_to_store_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.catalog_copy_log
    ADD CONSTRAINT catalog_copy_log_to_store_fkey FOREIGN KEY (to_store) REFERENCES public.stores(id);


--
-- Name: categories categories_store_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.stores(id);


--
-- Name: order_item_addons order_item_addons_addon_option_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.order_item_addons
    ADD CONSTRAINT order_item_addons_addon_option_id_fkey FOREIGN KEY (addon_option_id) REFERENCES public.addon_options(id) ON DELETE SET NULL;


--
-- Name: order_item_addons order_item_addons_order_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.order_item_addons
    ADD CONSTRAINT order_item_addons_order_item_id_fkey FOREIGN KEY (order_item_id) REFERENCES public.order_items(id) ON DELETE CASCADE;


--
-- Name: order_item_variations order_item_variations_order_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.order_item_variations
    ADD CONSTRAINT order_item_variations_order_item_id_fkey FOREIGN KEY (order_item_id) REFERENCES public.order_items(id) ON DELETE CASCADE;


--
-- Name: order_item_variations order_item_variations_variation_option_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.order_item_variations
    ADD CONSTRAINT order_item_variations_variation_option_id_fkey FOREIGN KEY (variation_option_id) REFERENCES public.variation_options(id) ON DELETE SET NULL;


--
-- Name: order_items order_items_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;


--
-- Name: order_items order_items_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id);


--
-- Name: order_items order_items_promotion_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_promotion_id_fkey FOREIGN KEY (promotion_id) REFERENCES public.promotions(id);


--
-- Name: order_status_history order_status_history_changed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.order_status_history
    ADD CONSTRAINT order_status_history_changed_by_fkey FOREIGN KEY (changed_by) REFERENCES public.profiles(id);


--
-- Name: order_status_history order_status_history_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.order_status_history
    ADD CONSTRAINT order_status_history_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;


--
-- Name: orders orders_attendant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_attendant_id_fkey FOREIGN KEY (attendant_id) REFERENCES public.attendants(id) ON DELETE RESTRICT;


--
-- Name: orders orders_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.profiles(id);


--
-- Name: orders orders_store_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.stores(id);


--
-- Name: orders orders_table_session_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_table_session_id_fkey FOREIGN KEY (table_session_id) REFERENCES public.table_sessions(id);


--
-- Name: product_addon_groups product_addon_groups_addon_group_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.product_addon_groups
    ADD CONSTRAINT product_addon_groups_addon_group_id_fkey FOREIGN KEY (addon_group_id) REFERENCES public.addon_groups(id) ON DELETE CASCADE;


--
-- Name: product_addon_groups product_addon_groups_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.product_addon_groups
    ADD CONSTRAINT product_addon_groups_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;


--
-- Name: product_variation_groups product_variation_groups_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.product_variation_groups
    ADD CONSTRAINT product_variation_groups_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;


--
-- Name: product_variation_groups product_variation_groups_variation_group_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.product_variation_groups
    ADD CONSTRAINT product_variation_groups_variation_group_id_fkey FOREIGN KEY (variation_group_id) REFERENCES public.variation_groups(id) ON DELETE CASCADE;


--
-- Name: products products_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(id);


--
-- Name: products products_store_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.stores(id);


--
-- Name: profiles profiles_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: profiles profiles_store_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.stores(id);


--
-- Name: promotion_combo_items promotion_combo_items_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.promotion_combo_items
    ADD CONSTRAINT promotion_combo_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id);


--
-- Name: promotion_combo_items promotion_combo_items_promotion_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.promotion_combo_items
    ADD CONSTRAINT promotion_combo_items_promotion_id_fkey FOREIGN KEY (promotion_id) REFERENCES public.promotions(id) ON DELETE CASCADE;


--
-- Name: promotions promotions_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.promotions
    ADD CONSTRAINT promotions_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id);


--
-- Name: promotions promotions_store_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.promotions
    ADD CONSTRAINT promotions_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.stores(id);


--
-- Name: table_sessions table_sessions_store_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.table_sessions
    ADD CONSTRAINT table_sessions_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.stores(id);


--
-- Name: variation_groups variation_groups_store_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.variation_groups
    ADD CONSTRAINT variation_groups_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE CASCADE;


--
-- Name: variation_options variation_options_group_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.variation_options
    ADD CONSTRAINT variation_options_group_id_fkey FOREIGN KEY (group_id) REFERENCES public.variation_groups(id) ON DELETE CASCADE;


--
-- Name: addon_groups; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.addon_groups ENABLE ROW LEVEL SECURITY;

--
-- Name: addon_options; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.addon_options ENABLE ROW LEVEL SECURITY;

--
-- Name: attendants; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.attendants ENABLE ROW LEVEL SECURITY;

--
-- Name: catalog_copy_log; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.catalog_copy_log ENABLE ROW LEVEL SECURITY;

--
-- Name: categories; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

--
-- Name: categories categories_public_read; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY categories_public_read ON public.categories FOR SELECT USING ((active = true));


--
-- Name: categories categories_store_admin_all; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY categories_store_admin_all ON public.categories USING ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'store_admin'::text) AND (profiles.store_id = categories.store_id)))));


--
-- Name: categories categories_super_admin_all; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY categories_super_admin_all ON public.categories USING ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'super_admin'::text)))));


--
-- Name: order_item_addons; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.order_item_addons ENABLE ROW LEVEL SECURITY;

--
-- Name: order_item_variations; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.order_item_variations ENABLE ROW LEVEL SECURITY;

--
-- Name: order_items; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

--
-- Name: order_status_history; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.order_status_history ENABLE ROW LEVEL SECURITY;

--
-- Name: orders; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

--
-- Name: product_addon_groups; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.product_addon_groups ENABLE ROW LEVEL SECURITY;

--
-- Name: product_variation_groups; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.product_variation_groups ENABLE ROW LEVEL SECURITY;

--
-- Name: products; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

--
-- Name: profiles; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

--
-- Name: promotion_combo_items; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.promotion_combo_items ENABLE ROW LEVEL SECURITY;

--
-- Name: promotion_combo_items promotion_combo_items_store_admin_all; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY promotion_combo_items_store_admin_all ON public.promotion_combo_items USING ((EXISTS ( SELECT 1
   FROM (public.promotions p
     JOIN public.profiles pr ON ((pr.id = auth.uid())))
  WHERE ((p.id = promotion_combo_items.promotion_id) AND (pr.role = 'store_admin'::text) AND (pr.store_id = p.store_id)))));


--
-- Name: promotion_combo_items promotion_combo_items_super_admin_all; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY promotion_combo_items_super_admin_all ON public.promotion_combo_items USING ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'super_admin'::text)))));


--
-- Name: promotions; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.promotions ENABLE ROW LEVEL SECURITY;

--
-- Name: addon_groups public read active addon_groups; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "public read active addon_groups" ON public.addon_groups FOR SELECT USING (active);


--
-- Name: addon_options public read active addon_options; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "public read active addon_options" ON public.addon_options FOR SELECT USING (active);


--
-- Name: variation_groups public read active variation_groups; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "public read active variation_groups" ON public.variation_groups FOR SELECT USING (active);


--
-- Name: variation_options public read active variation_options; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "public read active variation_options" ON public.variation_options FOR SELECT USING (active);


--
-- Name: product_addon_groups public read product_addon_groups for active products; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "public read product_addon_groups for active products" ON public.product_addon_groups FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.public_products
  WHERE ((public_products.id = product_addon_groups.product_id) AND public_products.active))));


--
-- Name: product_variation_groups public read product_variation_groups for active products; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "public read product_variation_groups for active products" ON public.product_variation_groups FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.public_products
  WHERE ((public_products.id = product_variation_groups.product_id) AND public_products.active))));


--
-- Name: profiles read own profile; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "read own profile" ON public.profiles FOR SELECT USING ((id = auth.uid()));


--
-- Name: addon_groups store_admin own addon_groups; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "store_admin own addon_groups" ON public.addon_groups USING (((public."current_role"() = 'store_admin'::text) AND (store_id = public.current_store_id())));


--
-- Name: addon_options store_admin own addon_options; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "store_admin own addon_options" ON public.addon_options USING (((public."current_role"() = 'store_admin'::text) AND (EXISTS ( SELECT 1
   FROM public.addon_groups
  WHERE ((addon_groups.id = addon_options.group_id) AND (addon_groups.store_id = public.current_store_id()))))));


--
-- Name: attendants store_admin own attendants; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "store_admin own attendants" ON public.attendants USING (((public."current_role"() = 'store_admin'::text) AND (store_id = public.current_store_id())));


--
-- Name: order_item_addons store_admin own order_item_addons; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "store_admin own order_item_addons" ON public.order_item_addons USING (((public."current_role"() = 'store_admin'::text) AND (EXISTS ( SELECT 1
   FROM (public.order_items
     JOIN public.orders ON ((orders.id = order_items.order_id)))
  WHERE ((order_items.id = order_item_addons.order_item_id) AND (orders.store_id = public.current_store_id()))))));


--
-- Name: order_item_variations store_admin own order_item_variations; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "store_admin own order_item_variations" ON public.order_item_variations USING (((public."current_role"() = 'store_admin'::text) AND (EXISTS ( SELECT 1
   FROM (public.order_items
     JOIN public.orders ON ((orders.id = order_items.order_id)))
  WHERE ((order_items.id = order_item_variations.order_item_id) AND (orders.store_id = public.current_store_id()))))));


--
-- Name: order_items store_admin own order_items; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "store_admin own order_items" ON public.order_items USING (((public."current_role"() = 'store_admin'::text) AND (EXISTS ( SELECT 1
   FROM public.orders
  WHERE ((orders.id = order_items.order_id) AND (orders.store_id = public.current_store_id()))))));


--
-- Name: order_status_history store_admin own order_status_history; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "store_admin own order_status_history" ON public.order_status_history USING (((public."current_role"() = 'store_admin'::text) AND (EXISTS ( SELECT 1
   FROM public.orders
  WHERE ((orders.id = order_status_history.order_id) AND (orders.store_id = public.current_store_id()))))));


--
-- Name: orders store_admin own orders; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "store_admin own orders" ON public.orders USING (((public."current_role"() = 'store_admin'::text) AND (store_id = public.current_store_id())));


--
-- Name: product_addon_groups store_admin own product_addon_groups; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "store_admin own product_addon_groups" ON public.product_addon_groups USING (((public."current_role"() = 'store_admin'::text) AND (EXISTS ( SELECT 1
   FROM public.products
  WHERE ((products.id = product_addon_groups.product_id) AND (products.store_id = public.current_store_id()))))));


--
-- Name: product_variation_groups store_admin own product_variation_groups; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "store_admin own product_variation_groups" ON public.product_variation_groups USING (((public."current_role"() = 'store_admin'::text) AND (EXISTS ( SELECT 1
   FROM public.products
  WHERE ((products.id = product_variation_groups.product_id) AND (products.store_id = public.current_store_id()))))));


--
-- Name: products store_admin own products; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "store_admin own products" ON public.products USING (((public."current_role"() = 'store_admin'::text) AND (store_id = public.current_store_id())));


--
-- Name: promotions store_admin own promotions; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "store_admin own promotions" ON public.promotions USING (((public."current_role"() = 'store_admin'::text) AND (store_id = public.current_store_id())));


--
-- Name: stores store_admin own store; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "store_admin own store" ON public.stores FOR SELECT USING (((public."current_role"() = 'store_admin'::text) AND (id = public.current_store_id())));


--
-- Name: variation_groups store_admin own variation_groups; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "store_admin own variation_groups" ON public.variation_groups USING (((public."current_role"() = 'store_admin'::text) AND (store_id = public.current_store_id())));


--
-- Name: variation_options store_admin own variation_options; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "store_admin own variation_options" ON public.variation_options USING (((public."current_role"() = 'store_admin'::text) AND (EXISTS ( SELECT 1
   FROM public.variation_groups
  WHERE ((variation_groups.id = variation_options.group_id) AND (variation_groups.store_id = public.current_store_id()))))));


--
-- Name: stores store_admin update own store; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "store_admin update own store" ON public.stores FOR UPDATE USING (((public."current_role"() = 'store_admin'::text) AND (id = public.current_store_id()))) WITH CHECK (((public."current_role"() = 'store_admin'::text) AND (id = public.current_store_id())));


--
-- Name: stores; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;

--
-- Name: addon_groups super_admin all addon_groups; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "super_admin all addon_groups" ON public.addon_groups USING ((public."current_role"() = 'super_admin'::text));


--
-- Name: addon_options super_admin all addon_options; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "super_admin all addon_options" ON public.addon_options USING ((public."current_role"() = 'super_admin'::text));


--
-- Name: attendants super_admin all attendants; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "super_admin all attendants" ON public.attendants USING ((public."current_role"() = 'super_admin'::text));


--
-- Name: order_item_addons super_admin all order_item_addons; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "super_admin all order_item_addons" ON public.order_item_addons USING ((public."current_role"() = 'super_admin'::text));


--
-- Name: order_item_variations super_admin all order_item_variations; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "super_admin all order_item_variations" ON public.order_item_variations USING ((public."current_role"() = 'super_admin'::text));


--
-- Name: order_items super_admin all order_items; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "super_admin all order_items" ON public.order_items USING ((public."current_role"() = 'super_admin'::text));


--
-- Name: order_status_history super_admin all order_status_history; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "super_admin all order_status_history" ON public.order_status_history USING ((public."current_role"() = 'super_admin'::text));


--
-- Name: orders super_admin all orders; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "super_admin all orders" ON public.orders USING ((public."current_role"() = 'super_admin'::text));


--
-- Name: product_addon_groups super_admin all product_addon_groups; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "super_admin all product_addon_groups" ON public.product_addon_groups USING ((public."current_role"() = 'super_admin'::text));


--
-- Name: product_variation_groups super_admin all product_variation_groups; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "super_admin all product_variation_groups" ON public.product_variation_groups USING ((public."current_role"() = 'super_admin'::text));


--
-- Name: products super_admin all products; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "super_admin all products" ON public.products USING ((public."current_role"() = 'super_admin'::text));


--
-- Name: promotions super_admin all promotions; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "super_admin all promotions" ON public.promotions USING ((public."current_role"() = 'super_admin'::text));


--
-- Name: stores super_admin all stores; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "super_admin all stores" ON public.stores USING ((public."current_role"() = 'super_admin'::text));


--
-- Name: variation_groups super_admin all variation_groups; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "super_admin all variation_groups" ON public.variation_groups USING ((public."current_role"() = 'super_admin'::text));


--
-- Name: variation_options super_admin all variation_options; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "super_admin all variation_options" ON public.variation_options USING ((public."current_role"() = 'super_admin'::text));


--
-- Name: catalog_copy_log super_admin lê log de cópia de catálogo; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "super_admin lê log de cópia de catálogo" ON public.catalog_copy_log FOR SELECT USING ((( SELECT profiles.role
   FROM public.profiles
  WHERE (profiles.id = auth.uid())) = 'super_admin'::text));


--
-- Name: profiles super_admin read all profiles; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "super_admin read all profiles" ON public.profiles FOR SELECT USING ((public."current_role"() = 'super_admin'::text));


--
-- Name: profiles super_admin update profiles; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "super_admin update profiles" ON public.profiles FOR UPDATE USING ((public."current_role"() = 'super_admin'::text));


--
-- Name: table_sessions; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.table_sessions ENABLE ROW LEVEL SECURITY;

--
-- Name: table_sessions table_sessions_store_admin_all; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY table_sessions_store_admin_all ON public.table_sessions USING ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'store_admin'::text) AND (profiles.store_id = table_sessions.store_id)))));


--
-- Name: table_sessions table_sessions_super_admin_all; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY table_sessions_super_admin_all ON public.table_sessions USING ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'super_admin'::text)))));


--
-- Name: variation_groups; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.variation_groups ENABLE ROW LEVEL SECURITY;

--
-- Name: variation_options; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.variation_options ENABLE ROW LEVEL SECURITY;

--
-- Name: SCHEMA public; Type: ACL; Schema: -; Owner: pg_database_owner
--

GRANT USAGE ON SCHEMA public TO postgres;
GRANT USAGE ON SCHEMA public TO anon;
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO service_role;


--
-- Name: FUNCTION add_order_item(p_order_id uuid, p_product_id uuid, p_quantity integer); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.add_order_item(p_order_id uuid, p_product_id uuid, p_quantity integer) TO anon;
GRANT ALL ON FUNCTION public.add_order_item(p_order_id uuid, p_product_id uuid, p_quantity integer) TO authenticated;
GRANT ALL ON FUNCTION public.add_order_item(p_order_id uuid, p_product_id uuid, p_quantity integer) TO service_role;


--
-- Name: FUNCTION add_order_item(p_order_id uuid, p_product_id uuid, p_quantity integer, p_variation_option_ids uuid[], p_addons jsonb); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.add_order_item(p_order_id uuid, p_product_id uuid, p_quantity integer, p_variation_option_ids uuid[], p_addons jsonb) TO anon;
GRANT ALL ON FUNCTION public.add_order_item(p_order_id uuid, p_product_id uuid, p_quantity integer, p_variation_option_ids uuid[], p_addons jsonb) TO authenticated;
GRANT ALL ON FUNCTION public.add_order_item(p_order_id uuid, p_product_id uuid, p_quantity integer, p_variation_option_ids uuid[], p_addons jsonb) TO service_role;


--
-- Name: FUNCTION assign_table_session(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.assign_table_session() TO anon;
GRANT ALL ON FUNCTION public.assign_table_session() TO authenticated;
GRANT ALL ON FUNCTION public.assign_table_session() TO service_role;


--
-- Name: FUNCTION change_order_status(p_order_id uuid, p_new_status text, p_attendant_id uuid, p_reason text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.change_order_status(p_order_id uuid, p_new_status text, p_attendant_id uuid, p_reason text) TO anon;
GRANT ALL ON FUNCTION public.change_order_status(p_order_id uuid, p_new_status text, p_attendant_id uuid, p_reason text) TO authenticated;
GRANT ALL ON FUNCTION public.change_order_status(p_order_id uuid, p_new_status text, p_attendant_id uuid, p_reason text) TO service_role;


--
-- Name: FUNCTION check_product_category_store(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.check_product_category_store() TO anon;
GRANT ALL ON FUNCTION public.check_product_category_store() TO authenticated;
GRANT ALL ON FUNCTION public.check_product_category_store() TO service_role;


--
-- Name: FUNCTION close_table_session(p_session_id uuid); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.close_table_session(p_session_id uuid) TO anon;
GRANT ALL ON FUNCTION public.close_table_session(p_session_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.close_table_session(p_session_id uuid) TO service_role;


--
-- Name: FUNCTION confirm_order(p_store_id uuid, p_order_type text, p_customer_name text, p_customer_cpf text, p_customer_phone text, p_delivery_address jsonb, p_items jsonb, p_table_number text, p_sales_channel text); Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON FUNCTION public.confirm_order(p_store_id uuid, p_order_type text, p_customer_name text, p_customer_cpf text, p_customer_phone text, p_delivery_address jsonb, p_items jsonb, p_table_number text, p_sales_channel text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.confirm_order(p_store_id uuid, p_order_type text, p_customer_name text, p_customer_cpf text, p_customer_phone text, p_delivery_address jsonb, p_items jsonb, p_table_number text, p_sales_channel text) TO anon;
GRANT ALL ON FUNCTION public.confirm_order(p_store_id uuid, p_order_type text, p_customer_name text, p_customer_cpf text, p_customer_phone text, p_delivery_address jsonb, p_items jsonb, p_table_number text, p_sales_channel text) TO authenticated;
GRANT ALL ON FUNCTION public.confirm_order(p_store_id uuid, p_order_type text, p_customer_name text, p_customer_cpf text, p_customer_phone text, p_delivery_address jsonb, p_items jsonb, p_table_number text, p_sales_channel text) TO service_role;


--
-- Name: FUNCTION copy_catalog(p_actor uuid, p_from_store uuid, p_to_store uuid, p_update_existing boolean, p_dry_run boolean); Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON FUNCTION public.copy_catalog(p_actor uuid, p_from_store uuid, p_to_store uuid, p_update_existing boolean, p_dry_run boolean) FROM PUBLIC;
GRANT ALL ON FUNCTION public.copy_catalog(p_actor uuid, p_from_store uuid, p_to_store uuid, p_update_existing boolean, p_dry_run boolean) TO service_role;


--
-- Name: FUNCTION "current_role"(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public."current_role"() TO anon;
GRANT ALL ON FUNCTION public."current_role"() TO authenticated;
GRANT ALL ON FUNCTION public."current_role"() TO service_role;


--
-- Name: FUNCTION current_store_id(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.current_store_id() TO anon;
GRANT ALL ON FUNCTION public.current_store_id() TO authenticated;
GRANT ALL ON FUNCTION public.current_store_id() TO service_role;


--
-- Name: FUNCTION get_order_status(p_order_id uuid, p_customer_cpf text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.get_order_status(p_order_id uuid, p_customer_cpf text) TO anon;
GRANT ALL ON FUNCTION public.get_order_status(p_order_id uuid, p_customer_cpf text) TO authenticated;
GRANT ALL ON FUNCTION public.get_order_status(p_order_id uuid, p_customer_cpf text) TO service_role;


--
-- Name: FUNCTION handle_new_user(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.handle_new_user() TO anon;
GRANT ALL ON FUNCTION public.handle_new_user() TO authenticated;
GRANT ALL ON FUNCTION public.handle_new_user() TO service_role;


--
-- Name: FUNCTION list_orders_by_cpf(p_store_id uuid, p_customer_cpf text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.list_orders_by_cpf(p_store_id uuid, p_customer_cpf text) TO anon;
GRANT ALL ON FUNCTION public.list_orders_by_cpf(p_store_id uuid, p_customer_cpf text) TO authenticated;
GRANT ALL ON FUNCTION public.list_orders_by_cpf(p_store_id uuid, p_customer_cpf text) TO service_role;


--
-- Name: FUNCTION order_items_reseller_stock_trg(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.order_items_reseller_stock_trg() TO anon;
GRANT ALL ON FUNCTION public.order_items_reseller_stock_trg() TO authenticated;
GRANT ALL ON FUNCTION public.order_items_reseller_stock_trg() TO service_role;


--
-- Name: FUNCTION orders_reseller_stock_restore_trg(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.orders_reseller_stock_restore_trg() TO anon;
GRANT ALL ON FUNCTION public.orders_reseller_stock_restore_trg() TO authenticated;
GRANT ALL ON FUNCTION public.orders_reseller_stock_restore_trg() TO service_role;


--
-- Name: FUNCTION remove_order_item(p_item_id uuid); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.remove_order_item(p_item_id uuid) TO anon;
GRANT ALL ON FUNCTION public.remove_order_item(p_item_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.remove_order_item(p_item_id uuid) TO service_role;


--
-- Name: FUNCTION reseller_stock_apply(p_product_id uuid, p_store_id uuid, p_delta numeric); Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON FUNCTION public.reseller_stock_apply(p_product_id uuid, p_store_id uuid, p_delta numeric) FROM PUBLIC;
GRANT ALL ON FUNCTION public.reseller_stock_apply(p_product_id uuid, p_store_id uuid, p_delta numeric) TO service_role;


--
-- Name: FUNCTION revert_order_status(p_order_id uuid); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.revert_order_status(p_order_id uuid) TO anon;
GRANT ALL ON FUNCTION public.revert_order_status(p_order_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.revert_order_status(p_order_id uuid) TO service_role;


--
-- Name: FUNCTION rls_auto_enable(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.rls_auto_enable() TO anon;
GRANT ALL ON FUNCTION public.rls_auto_enable() TO authenticated;
GRANT ALL ON FUNCTION public.rls_auto_enable() TO service_role;


--
-- Name: FUNCTION sanitize_order_contact_fields(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.sanitize_order_contact_fields() TO anon;
GRANT ALL ON FUNCTION public.sanitize_order_contact_fields() TO authenticated;
GRANT ALL ON FUNCTION public.sanitize_order_contact_fields() TO service_role;


--
-- Name: FUNCTION set_admin_active(p_user_id uuid, p_active boolean); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.set_admin_active(p_user_id uuid, p_active boolean) TO anon;
GRANT ALL ON FUNCTION public.set_admin_active(p_user_id uuid, p_active boolean) TO authenticated;
GRANT ALL ON FUNCTION public.set_admin_active(p_user_id uuid, p_active boolean) TO service_role;


--
-- Name: FUNCTION update_order_item(p_item_id uuid, p_quantity integer, p_variation_option_ids uuid[], p_addons jsonb); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.update_order_item(p_item_id uuid, p_quantity integer, p_variation_option_ids uuid[], p_addons jsonb) TO anon;
GRANT ALL ON FUNCTION public.update_order_item(p_item_id uuid, p_quantity integer, p_variation_option_ids uuid[], p_addons jsonb) TO authenticated;
GRANT ALL ON FUNCTION public.update_order_item(p_item_id uuid, p_quantity integer, p_variation_option_ids uuid[], p_addons jsonb) TO service_role;


--
-- Name: FUNCTION update_order_item_quantity(p_item_id uuid, p_quantity integer); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.update_order_item_quantity(p_item_id uuid, p_quantity integer) TO anon;
GRANT ALL ON FUNCTION public.update_order_item_quantity(p_item_id uuid, p_quantity integer) TO authenticated;
GRANT ALL ON FUNCTION public.update_order_item_quantity(p_item_id uuid, p_quantity integer) TO service_role;


--
-- Name: TABLE addon_groups; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,MAINTAIN ON TABLE public.addon_groups TO anon;
GRANT ALL ON TABLE public.addon_groups TO authenticated;
GRANT ALL ON TABLE public.addon_groups TO service_role;


--
-- Name: TABLE addon_options; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,MAINTAIN ON TABLE public.addon_options TO anon;
GRANT ALL ON TABLE public.addon_options TO authenticated;
GRANT ALL ON TABLE public.addon_options TO service_role;


--
-- Name: TABLE attendants; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.attendants TO anon;
GRANT ALL ON TABLE public.attendants TO authenticated;
GRANT ALL ON TABLE public.attendants TO service_role;


--
-- Name: TABLE catalog_copy_log; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.catalog_copy_log TO anon;
GRANT ALL ON TABLE public.catalog_copy_log TO authenticated;
GRANT ALL ON TABLE public.catalog_copy_log TO service_role;


--
-- Name: TABLE categories; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.categories TO anon;
GRANT ALL ON TABLE public.categories TO authenticated;
GRANT ALL ON TABLE public.categories TO service_role;


--
-- Name: TABLE order_item_addons; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.order_item_addons TO anon;
GRANT ALL ON TABLE public.order_item_addons TO authenticated;
GRANT ALL ON TABLE public.order_item_addons TO service_role;


--
-- Name: TABLE order_item_variations; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.order_item_variations TO anon;
GRANT ALL ON TABLE public.order_item_variations TO authenticated;
GRANT ALL ON TABLE public.order_item_variations TO service_role;


--
-- Name: TABLE order_items; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.order_items TO anon;
GRANT ALL ON TABLE public.order_items TO authenticated;
GRANT ALL ON TABLE public.order_items TO service_role;


--
-- Name: TABLE order_status_history; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.order_status_history TO anon;
GRANT ALL ON TABLE public.order_status_history TO authenticated;
GRANT ALL ON TABLE public.order_status_history TO service_role;


--
-- Name: TABLE orders; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.orders TO anon;
GRANT ALL ON TABLE public.orders TO authenticated;
GRANT ALL ON TABLE public.orders TO service_role;


--
-- Name: TABLE product_addon_groups; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,MAINTAIN ON TABLE public.product_addon_groups TO anon;
GRANT ALL ON TABLE public.product_addon_groups TO authenticated;
GRANT ALL ON TABLE public.product_addon_groups TO service_role;


--
-- Name: TABLE product_variation_groups; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,MAINTAIN ON TABLE public.product_variation_groups TO anon;
GRANT ALL ON TABLE public.product_variation_groups TO authenticated;
GRANT ALL ON TABLE public.product_variation_groups TO service_role;


--
-- Name: TABLE products; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.products TO anon;
GRANT ALL ON TABLE public.products TO authenticated;
GRANT ALL ON TABLE public.products TO service_role;


--
-- Name: TABLE profiles; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.profiles TO anon;
GRANT ALL ON TABLE public.profiles TO authenticated;
GRANT ALL ON TABLE public.profiles TO service_role;


--
-- Name: TABLE promotion_combo_items; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.promotion_combo_items TO anon;
GRANT ALL ON TABLE public.promotion_combo_items TO authenticated;
GRANT ALL ON TABLE public.promotion_combo_items TO service_role;


--
-- Name: TABLE promotions; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.promotions TO anon;
GRANT ALL ON TABLE public.promotions TO authenticated;
GRANT ALL ON TABLE public.promotions TO service_role;


--
-- Name: TABLE public_product_addon_groups; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,MAINTAIN ON TABLE public.public_product_addon_groups TO anon;
GRANT SELECT,MAINTAIN ON TABLE public.public_product_addon_groups TO authenticated;
GRANT ALL ON TABLE public.public_product_addon_groups TO service_role;


--
-- Name: TABLE variation_groups; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,MAINTAIN ON TABLE public.variation_groups TO anon;
GRANT ALL ON TABLE public.variation_groups TO authenticated;
GRANT ALL ON TABLE public.variation_groups TO service_role;


--
-- Name: TABLE variation_options; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,MAINTAIN ON TABLE public.variation_options TO anon;
GRANT ALL ON TABLE public.variation_options TO authenticated;
GRANT ALL ON TABLE public.variation_options TO service_role;


--
-- Name: TABLE public_product_variation_groups; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,MAINTAIN ON TABLE public.public_product_variation_groups TO anon;
GRANT SELECT,MAINTAIN ON TABLE public.public_product_variation_groups TO authenticated;
GRANT ALL ON TABLE public.public_product_variation_groups TO service_role;


--
-- Name: TABLE public_products; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,MAINTAIN ON TABLE public.public_products TO anon;
GRANT SELECT,MAINTAIN ON TABLE public.public_products TO authenticated;
GRANT ALL ON TABLE public.public_products TO service_role;


--
-- Name: TABLE public_promotion_combo_items; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,MAINTAIN ON TABLE public.public_promotion_combo_items TO anon;
GRANT SELECT,MAINTAIN ON TABLE public.public_promotion_combo_items TO authenticated;
GRANT ALL ON TABLE public.public_promotion_combo_items TO service_role;


--
-- Name: TABLE public_promotions; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,MAINTAIN ON TABLE public.public_promotions TO anon;
GRANT SELECT,MAINTAIN ON TABLE public.public_promotions TO authenticated;
GRANT ALL ON TABLE public.public_promotions TO service_role;


--
-- Name: TABLE stores; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.stores TO anon;
GRANT ALL ON TABLE public.stores TO authenticated;
GRANT ALL ON TABLE public.stores TO service_role;


--
-- Name: TABLE public_stores; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,MAINTAIN ON TABLE public.public_stores TO anon;
GRANT SELECT,MAINTAIN ON TABLE public.public_stores TO authenticated;
GRANT ALL ON TABLE public.public_stores TO service_role;


--
-- Name: TABLE table_sessions; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.table_sessions TO anon;
GRANT ALL ON TABLE public.table_sessions TO authenticated;
GRANT ALL ON TABLE public.table_sessions TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: public; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: public; Owner: supabase_admin
--



--
-- Name: DEFAULT PRIVILEGES FOR FUNCTIONS; Type: DEFAULT ACL; Schema: public; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR FUNCTIONS; Type: DEFAULT ACL; Schema: public; Owner: supabase_admin
--



--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: supabase_admin
--



--
-- PostgreSQL database dump complete
--

\unrestrict 1JsEIseQm1vd9ztDWgI3X0EmrSZ0MU1dn0jAJbgs6OSOfpEw8HEShkJVorPRGW5


-- ===== Reset de grants (igualar a producao) =====
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon, authenticated, service_role;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon, authenticated, service_role;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA public FROM anon, authenticated, service_role, PUBLIC;
GRANT ALL ON FUNCTION public.add_order_item(p_order_id uuid, p_product_id uuid, p_quantity integer) TO anon;
GRANT ALL ON FUNCTION public.add_order_item(p_order_id uuid, p_product_id uuid, p_quantity integer) TO authenticated;
GRANT ALL ON FUNCTION public.add_order_item(p_order_id uuid, p_product_id uuid, p_quantity integer) TO service_role;
GRANT ALL ON FUNCTION public.add_order_item(p_order_id uuid, p_product_id uuid, p_quantity integer, p_variation_option_ids uuid[], p_addons jsonb) TO anon;
GRANT ALL ON FUNCTION public.add_order_item(p_order_id uuid, p_product_id uuid, p_quantity integer, p_variation_option_ids uuid[], p_addons jsonb) TO authenticated;
GRANT ALL ON FUNCTION public.add_order_item(p_order_id uuid, p_product_id uuid, p_quantity integer, p_variation_option_ids uuid[], p_addons jsonb) TO service_role;
GRANT ALL ON FUNCTION public.assign_table_session() TO anon;
GRANT ALL ON FUNCTION public.assign_table_session() TO authenticated;
GRANT ALL ON FUNCTION public.assign_table_session() TO service_role;
GRANT ALL ON FUNCTION public.change_order_status(p_order_id uuid, p_new_status text, p_attendant_id uuid, p_reason text) TO anon;
GRANT ALL ON FUNCTION public.change_order_status(p_order_id uuid, p_new_status text, p_attendant_id uuid, p_reason text) TO authenticated;
GRANT ALL ON FUNCTION public.change_order_status(p_order_id uuid, p_new_status text, p_attendant_id uuid, p_reason text) TO service_role;
GRANT ALL ON FUNCTION public.check_product_category_store() TO anon;
GRANT ALL ON FUNCTION public.check_product_category_store() TO authenticated;
GRANT ALL ON FUNCTION public.check_product_category_store() TO service_role;
GRANT ALL ON FUNCTION public.close_table_session(p_session_id uuid) TO anon;
GRANT ALL ON FUNCTION public.close_table_session(p_session_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.close_table_session(p_session_id uuid) TO service_role;
REVOKE ALL ON FUNCTION public.confirm_order(p_store_id uuid, p_order_type text, p_customer_name text, p_customer_cpf text, p_customer_phone text, p_delivery_address jsonb, p_items jsonb, p_table_number text, p_sales_channel text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.confirm_order(p_store_id uuid, p_order_type text, p_customer_name text, p_customer_cpf text, p_customer_phone text, p_delivery_address jsonb, p_items jsonb, p_table_number text, p_sales_channel text) TO anon;
GRANT ALL ON FUNCTION public.confirm_order(p_store_id uuid, p_order_type text, p_customer_name text, p_customer_cpf text, p_customer_phone text, p_delivery_address jsonb, p_items jsonb, p_table_number text, p_sales_channel text) TO authenticated;
GRANT ALL ON FUNCTION public.confirm_order(p_store_id uuid, p_order_type text, p_customer_name text, p_customer_cpf text, p_customer_phone text, p_delivery_address jsonb, p_items jsonb, p_table_number text, p_sales_channel text) TO service_role;
REVOKE ALL ON FUNCTION public.copy_catalog(p_actor uuid, p_from_store uuid, p_to_store uuid, p_update_existing boolean, p_dry_run boolean) FROM PUBLIC;
GRANT ALL ON FUNCTION public.copy_catalog(p_actor uuid, p_from_store uuid, p_to_store uuid, p_update_existing boolean, p_dry_run boolean) TO service_role;
GRANT ALL ON FUNCTION public."current_role"() TO anon;
GRANT ALL ON FUNCTION public."current_role"() TO authenticated;
GRANT ALL ON FUNCTION public."current_role"() TO service_role;
GRANT ALL ON FUNCTION public.current_store_id() TO anon;
GRANT ALL ON FUNCTION public.current_store_id() TO authenticated;
GRANT ALL ON FUNCTION public.current_store_id() TO service_role;
GRANT ALL ON FUNCTION public.get_order_status(p_order_id uuid, p_customer_cpf text) TO anon;
GRANT ALL ON FUNCTION public.get_order_status(p_order_id uuid, p_customer_cpf text) TO authenticated;
GRANT ALL ON FUNCTION public.get_order_status(p_order_id uuid, p_customer_cpf text) TO service_role;
GRANT ALL ON FUNCTION public.handle_new_user() TO anon;
GRANT ALL ON FUNCTION public.handle_new_user() TO authenticated;
GRANT ALL ON FUNCTION public.handle_new_user() TO service_role;
GRANT ALL ON FUNCTION public.list_orders_by_cpf(p_store_id uuid, p_customer_cpf text) TO anon;
GRANT ALL ON FUNCTION public.list_orders_by_cpf(p_store_id uuid, p_customer_cpf text) TO authenticated;
GRANT ALL ON FUNCTION public.list_orders_by_cpf(p_store_id uuid, p_customer_cpf text) TO service_role;
GRANT ALL ON FUNCTION public.order_items_reseller_stock_trg() TO anon;
GRANT ALL ON FUNCTION public.order_items_reseller_stock_trg() TO authenticated;
GRANT ALL ON FUNCTION public.order_items_reseller_stock_trg() TO service_role;
GRANT ALL ON FUNCTION public.orders_reseller_stock_restore_trg() TO anon;
GRANT ALL ON FUNCTION public.orders_reseller_stock_restore_trg() TO authenticated;
GRANT ALL ON FUNCTION public.orders_reseller_stock_restore_trg() TO service_role;
GRANT ALL ON FUNCTION public.remove_order_item(p_item_id uuid) TO anon;
GRANT ALL ON FUNCTION public.remove_order_item(p_item_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.remove_order_item(p_item_id uuid) TO service_role;
REVOKE ALL ON FUNCTION public.reseller_stock_apply(p_product_id uuid, p_store_id uuid, p_delta numeric) FROM PUBLIC;
GRANT ALL ON FUNCTION public.reseller_stock_apply(p_product_id uuid, p_store_id uuid, p_delta numeric) TO service_role;
GRANT ALL ON FUNCTION public.revert_order_status(p_order_id uuid) TO anon;
GRANT ALL ON FUNCTION public.revert_order_status(p_order_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.revert_order_status(p_order_id uuid) TO service_role;
GRANT ALL ON FUNCTION public.rls_auto_enable() TO anon;
GRANT ALL ON FUNCTION public.rls_auto_enable() TO authenticated;
GRANT ALL ON FUNCTION public.rls_auto_enable() TO service_role;
GRANT ALL ON FUNCTION public.sanitize_order_contact_fields() TO anon;
GRANT ALL ON FUNCTION public.sanitize_order_contact_fields() TO authenticated;
GRANT ALL ON FUNCTION public.sanitize_order_contact_fields() TO service_role;
GRANT ALL ON FUNCTION public.set_admin_active(p_user_id uuid, p_active boolean) TO anon;
GRANT ALL ON FUNCTION public.set_admin_active(p_user_id uuid, p_active boolean) TO authenticated;
GRANT ALL ON FUNCTION public.set_admin_active(p_user_id uuid, p_active boolean) TO service_role;
GRANT ALL ON FUNCTION public.update_order_item(p_item_id uuid, p_quantity integer, p_variation_option_ids uuid[], p_addons jsonb) TO anon;
GRANT ALL ON FUNCTION public.update_order_item(p_item_id uuid, p_quantity integer, p_variation_option_ids uuid[], p_addons jsonb) TO authenticated;
GRANT ALL ON FUNCTION public.update_order_item(p_item_id uuid, p_quantity integer, p_variation_option_ids uuid[], p_addons jsonb) TO service_role;
GRANT ALL ON FUNCTION public.update_order_item_quantity(p_item_id uuid, p_quantity integer) TO anon;
GRANT ALL ON FUNCTION public.update_order_item_quantity(p_item_id uuid, p_quantity integer) TO authenticated;
GRANT ALL ON FUNCTION public.update_order_item_quantity(p_item_id uuid, p_quantity integer) TO service_role;
GRANT SELECT,MAINTAIN ON TABLE public.addon_groups TO anon;
GRANT ALL ON TABLE public.addon_groups TO authenticated;
GRANT ALL ON TABLE public.addon_groups TO service_role;
GRANT SELECT,MAINTAIN ON TABLE public.addon_options TO anon;
GRANT ALL ON TABLE public.addon_options TO authenticated;
GRANT ALL ON TABLE public.addon_options TO service_role;
GRANT ALL ON TABLE public.attendants TO anon;
GRANT ALL ON TABLE public.attendants TO authenticated;
GRANT ALL ON TABLE public.attendants TO service_role;
GRANT ALL ON TABLE public.catalog_copy_log TO anon;
GRANT ALL ON TABLE public.catalog_copy_log TO authenticated;
GRANT ALL ON TABLE public.catalog_copy_log TO service_role;
GRANT ALL ON TABLE public.categories TO anon;
GRANT ALL ON TABLE public.categories TO authenticated;
GRANT ALL ON TABLE public.categories TO service_role;
GRANT ALL ON TABLE public.order_item_addons TO anon;
GRANT ALL ON TABLE public.order_item_addons TO authenticated;
GRANT ALL ON TABLE public.order_item_addons TO service_role;
GRANT ALL ON TABLE public.order_item_variations TO anon;
GRANT ALL ON TABLE public.order_item_variations TO authenticated;
GRANT ALL ON TABLE public.order_item_variations TO service_role;
GRANT ALL ON TABLE public.order_items TO anon;
GRANT ALL ON TABLE public.order_items TO authenticated;
GRANT ALL ON TABLE public.order_items TO service_role;
GRANT ALL ON TABLE public.order_status_history TO anon;
GRANT ALL ON TABLE public.order_status_history TO authenticated;
GRANT ALL ON TABLE public.order_status_history TO service_role;
GRANT ALL ON TABLE public.orders TO anon;
GRANT ALL ON TABLE public.orders TO authenticated;
GRANT ALL ON TABLE public.orders TO service_role;
GRANT SELECT,MAINTAIN ON TABLE public.product_addon_groups TO anon;
GRANT ALL ON TABLE public.product_addon_groups TO authenticated;
GRANT ALL ON TABLE public.product_addon_groups TO service_role;
GRANT SELECT,MAINTAIN ON TABLE public.product_variation_groups TO anon;
GRANT ALL ON TABLE public.product_variation_groups TO authenticated;
GRANT ALL ON TABLE public.product_variation_groups TO service_role;
GRANT ALL ON TABLE public.products TO anon;
GRANT ALL ON TABLE public.products TO authenticated;
GRANT ALL ON TABLE public.products TO service_role;
GRANT ALL ON TABLE public.profiles TO anon;
GRANT ALL ON TABLE public.profiles TO authenticated;
GRANT ALL ON TABLE public.profiles TO service_role;
GRANT ALL ON TABLE public.promotion_combo_items TO anon;
GRANT ALL ON TABLE public.promotion_combo_items TO authenticated;
GRANT ALL ON TABLE public.promotion_combo_items TO service_role;
GRANT ALL ON TABLE public.promotions TO anon;
GRANT ALL ON TABLE public.promotions TO authenticated;
GRANT ALL ON TABLE public.promotions TO service_role;
GRANT SELECT,MAINTAIN ON TABLE public.public_product_addon_groups TO anon;
GRANT SELECT,MAINTAIN ON TABLE public.public_product_addon_groups TO authenticated;
GRANT ALL ON TABLE public.public_product_addon_groups TO service_role;
GRANT SELECT,MAINTAIN ON TABLE public.variation_groups TO anon;
GRANT ALL ON TABLE public.variation_groups TO authenticated;
GRANT ALL ON TABLE public.variation_groups TO service_role;
GRANT SELECT,MAINTAIN ON TABLE public.variation_options TO anon;
GRANT ALL ON TABLE public.variation_options TO authenticated;
GRANT ALL ON TABLE public.variation_options TO service_role;
GRANT SELECT,MAINTAIN ON TABLE public.public_product_variation_groups TO anon;
GRANT SELECT,MAINTAIN ON TABLE public.public_product_variation_groups TO authenticated;
GRANT ALL ON TABLE public.public_product_variation_groups TO service_role;
GRANT SELECT,MAINTAIN ON TABLE public.public_products TO anon;
GRANT SELECT,MAINTAIN ON TABLE public.public_products TO authenticated;
GRANT ALL ON TABLE public.public_products TO service_role;
GRANT SELECT,MAINTAIN ON TABLE public.public_promotion_combo_items TO anon;
GRANT SELECT,MAINTAIN ON TABLE public.public_promotion_combo_items TO authenticated;
GRANT ALL ON TABLE public.public_promotion_combo_items TO service_role;
GRANT SELECT,MAINTAIN ON TABLE public.public_promotions TO anon;
GRANT SELECT,MAINTAIN ON TABLE public.public_promotions TO authenticated;
GRANT ALL ON TABLE public.public_promotions TO service_role;
GRANT ALL ON TABLE public.stores TO anon;
GRANT ALL ON TABLE public.stores TO authenticated;
GRANT ALL ON TABLE public.stores TO service_role;
GRANT SELECT,MAINTAIN ON TABLE public.public_stores TO anon;
GRANT SELECT,MAINTAIN ON TABLE public.public_stores TO authenticated;
GRANT ALL ON TABLE public.public_stores TO service_role;
GRANT ALL ON TABLE public.table_sessions TO anon;
GRANT ALL ON TABLE public.table_sessions TO authenticated;
GRANT ALL ON TABLE public.table_sessions TO service_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO PUBLIC;
REVOKE ALL ON FUNCTION public.confirm_order(p_store_id uuid, p_order_type text, p_customer_name text, p_customer_cpf text, p_customer_phone text, p_delivery_address jsonb, p_items jsonb, p_table_number text, p_sales_channel text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.copy_catalog(p_actor uuid, p_from_store uuid, p_to_store uuid, p_update_existing boolean, p_dry_run boolean) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.reseller_stock_apply(p_product_id uuid, p_store_id uuid, p_delta numeric) FROM PUBLIC;

-- ===== Fora do schema public: storage, auth, realtime =====
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values ('product-images', 'product-images', true, null, NULL) on conflict (id) do nothing;
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values ('promotions', 'promotions', true, null, NULL) on conflict (id) do nothing;
create policy "Public read promotions images" on storage.objects as PERMISSIVE for SELECT to public using ((bucket_id = 'promotions'::text));
create policy "Store admin upload promotions images" on storage.objects as PERMISSIVE for INSERT to authenticated with check ((bucket_id = 'promotions'::text));
create policy "product images delete scoped by store" on storage.objects as PERMISSIVE for DELETE to public using (((bucket_id = 'product-images'::text) AND ((public."current_role"() = 'super_admin'::text) OR ((public."current_role"() = 'store_admin'::text) AND ((storage.foldername(name))[1] = (public.current_store_id())::text)))));
create policy "product images upload scoped by store" on storage.objects as PERMISSIVE for INSERT to public with check (((bucket_id = 'product-images'::text) AND ((public."current_role"() = 'super_admin'::text) OR ((public."current_role"() = 'store_admin'::text) AND ((storage.foldername(name))[1] = (public.current_store_id())::text)))));
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();
alter publication supabase_realtime add table public.orders;

-- event trigger que liga RLS sozinho em tabela nova (existe na producao)
create event trigger ensure_rls on ddl_command_end when tag in ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO') execute function public.rls_auto_enable();

-- pg_dump zera o search_path no inicio do arquivo; devolve o padrao pra nao
-- afetar o que rodar depois na mesma sessao (seed, proximas migrations).
reset search_path;
