-- ============================================================================
-- Feature: Canal revendedor no storefront  (ver CLAUDE.md — "Feature: Aba Revendedores")
-- Cópia de referência — o que roda de verdade está no Supabase (SQL Editor).
-- Pré-requisito: docs/supabase/reseller_stock.sql já aplicado (colunas reseller_*).
-- Idempotente: rodar de novo o arquivo inteiro é seguro.
--
-- 1. View public_products passa a expor reseller_stock_quantity / reseller_track_stock
-- 2. confirm_order ganha p_sales_channel ('retail' | 'reseller')
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. View public_products
--    - CREATE OR REPLACE VIEW só aceita ACRESCENTAR colunas no fim: as colunas atuais
--      ficam idênticas (cost_price e external_code continuam de fora).
--    - O saldo só sai preenchido em produto com available_reseller = true; produto de
--      varejo devolve NULL. O banco não sabe de qual cardápio a leitura veio (a view é
--      pública), então isso limita a exposição ao que já é do canal revendedor.
--    - Grants são preservados pelo CREATE OR REPLACE. As opções da view (ex.
--      security_invoker) podem ser zeradas por ele, então são lidas antes e reaplicadas.
-- ----------------------------------------------------------------------------
do $$
declare
  v_opts text[];
begin
  select reloptions into v_opts from pg_class where oid = 'public.public_products'::regclass;

  create or replace view public.public_products as
  select
    id, store_id, name, ncm, unit, category, description, image_url,
    stock_quantity, track_stock, price, lover_price, sort_order, active, created_at,
    available_dine_in, available_pickup, available_delivery, available_reseller, category_id,
    case when available_reseller then reseller_stock_quantity end as reseller_stock_quantity,
    case when available_reseller then reseller_track_stock end as reseller_track_stock
  from products;

  if v_opts is not null then
    execute format('alter view public.public_products set (%s)', array_to_string(v_opts, ', '));
  end if;
end $$;

-- ----------------------------------------------------------------------------
-- 2. confirm_order com canal de venda
--    Mudanças em relação à versão anterior (todo o resto é idêntico):
--    - novo parâmetro p_sales_channel text default 'retail' (validado; gravado em orders)
--    - 'reseller' nunca combina com dine_in, e exige stores.reseller_enabled
--    - 'reseller' só aceita produto com available_reseller = true (item avulso e de combo)
--    - checagem de estoque NORMAL (track_stock/stock_quantity) só vale pro varejo: o
--      revendedor tem estoque próprio, controlado pelo trigger order_items_reseller_stock
--      (docs/supabase/reseller_stock.sql). Pedido de varejo nunca mexe nesse saldo.
--    - quantity > 0 validada na entrada, pra qualquer canal
--    - itens inseridos em ordem de product_id (dois pedidos com os mesmos produtos em
--      ordem diferente travariam um ao outro nas linhas de products — deadlock)
--    Trocar a assinatura cria uma SEGUNDA sobrecarga (a chamada vira ambígua no
--    PostgREST) — por isso o drop da antiga, antes do create.
-- ----------------------------------------------------------------------------
drop function if exists confirm_order(uuid, text, text, text, text, jsonb, jsonb, text);

create or replace function public.confirm_order(
  p_store_id uuid,
  p_order_type text,
  p_customer_name text,
  p_customer_cpf text,
  p_customer_phone text,
  p_delivery_address jsonb,
  p_items jsonb,
  p_table_number text default null::text,
  p_sales_channel text default 'retail'
)
returns uuid
language plpgsql
security definer
set search_path to 'public'
as $function$
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
$function$;

-- O drop acima leva junto os grants da versão antiga. O storefront chama esta função
-- sem login (anon) e logado (authenticated).
revoke execute on function public.confirm_order(uuid, text, text, text, text, jsonb, jsonb, text, text) from public;
grant execute on function public.confirm_order(uuid, text, text, text, text, jsonb, jsonb, text, text)
  to anon, authenticated, service_role;

-- ----------------------------------------------------------------------------
-- 3. Hardening: view pública é só leitura
--    A view NÃO é security_invoker (reloptions = null, confirmado), então roda como o dono,
--    sem a RLS de products. Os grants padrão davam INSERT/UPDATE/DELETE/TRUNCATE a anon e
--    authenticated, e como é uma view simples (auto-atualizável), um UPDATE nela passava
--    por cima da RLS (ex.: PATCH /rest/v1/public_products?id=eq.<id> {"price":0}).
--    O storefront só lê a view e o admin escreve na tabela products, então tirar a
--    escrita não muda nada do que existe hoje. SELECT continua.
-- ----------------------------------------------------------------------------
revoke insert, update, delete, truncate, references, trigger
  on public.public_products from anon, authenticated;
