-- ============================================================================
-- Feature: Copiar catálogo pra outra loja  (ver CLAUDE.md)
-- Cópia de referência — o que roda de verdade está no Supabase (SQL Editor).
-- Ao alterar lá, atualize este arquivo e commite junto.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Tabela de auditoria (achado #5 da security-sweep)
-- ----------------------------------------------------------------------------
create table if not exists catalog_copy_log (
  id              uuid primary key default gen_random_uuid(),
  actor_id        uuid not null references profiles(id),
  from_store      uuid not null references stores(id),
  to_store        uuid not null references stores(id),
  update_existing boolean not null,
  created_count   int not null,
  updated_count   int not null,
  skipped_count   int not null,
  image_count     int not null,
  ran_at          timestamptz not null default now()
);

alter table catalog_copy_log enable row level security;

-- só super_admin lê; ninguém insere direto — só a RPC (security definer)
drop policy if exists "super_admin lê log de cópia de catálogo" on catalog_copy_log;
create policy "super_admin lê log de cópia de catálogo"
  on catalog_copy_log for select
  using ((select role from profiles where id = auth.uid()) = 'super_admin');

-- ----------------------------------------------------------------------------
-- 2. RPC copy_catalog
--    - security definer, search_path fixo
--    - NÃO usa auth.uid(): recebe p_actor da Edge Function (que valida o JWT)
--    - revoke de authenticated + grant só service_role => não é chamável direto
--    - pg_advisory_xact_lock por loja destino (achado #4)
--    - grava catalog_copy_log em execução real (achado #5)
--    A assinatura mudou em relação à v1 (ganhou p_actor) — daí o drop antes.
-- ----------------------------------------------------------------------------
drop function if exists copy_catalog(uuid, uuid, boolean, boolean);
drop function if exists copy_catalog(uuid, uuid, uuid, boolean, boolean);

create function copy_catalog(
  p_actor           uuid,
  p_from_store      uuid,
  p_to_store        uuid,
  p_update_existing boolean default false,
  p_dry_run         boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
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
begin
  -- actor tem que ser super_admin (achado #2 — a senha é revalidada na Edge Function,
  -- e a RPC só é invocável por service_role, então este é o único caminho)
  select role into v_role from profiles where id = p_actor;
  if v_role is distinct from 'super_admin' then
    raise exception 'Apenas super_admin pode copiar catálogo' using errcode = '42501';
  end if;
  if p_from_store = p_to_store then
    raise exception 'Origem e destino não podem ser a mesma loja' using errcode = '22023';
  end if;

  -- serializa cópias concorrentes pro mesmo destino (evita categoria/grupo duplicado)
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

    -- categoria da origem -> acha-ou-cria no destino por nome (sem caixa)
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

    if not v_exists and r_prod.image_url is not null and r_prod.image_url <> '' then
      v_image_count := v_image_count + 1;
    end if;

    if p_dry_run then
      if v_exists then v_updated := v_updated + 1; else v_created := v_created + 1; end if;
      continue;
    end if;

    -- upsert do produto no destino
    -- stock 0 + track_stock false (cada loja conta o próprio); preço/custo/lover da origem;
    -- image_url = url da origem, provisória (a Edge Function copia o arquivo e troca)
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
      -- não mexe em image_url / stock_quantity / track_stock numa 2ª rodada
    returning id into v_to_prod_id;

    if v_exists then
      v_updated := v_updated + 1;
    else
      v_created := v_created + 1;
      if r_prod.image_url is not null and r_prod.image_url <> '' then
        v_images := v_images || jsonb_build_object('product_id', v_to_prod_id, 'source_url', r_prod.image_url);
      end if;
    end if;

    -- adicionais: acha-ou-cria grupo/opções por nome no destino, recria o vínculo com a config
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

    -- variações: mesma lógica (o grupo carrega price_mode)
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

  -- auditoria: só execução real (dry-run não grava)
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

revoke execute on function copy_catalog(uuid, uuid, uuid, boolean, boolean) from public, anon, authenticated;
grant  execute on function copy_catalog(uuid, uuid, uuid, boolean, boolean) to service_role;

-- Conferir que sobrou só 1 versão:
--   select oid::regprocedure from pg_proc where proname = 'copy_catalog';
-- Deve retornar: copy_catalog(uuid,uuid,uuid,boolean,boolean)

-- Consulta do log:
--   select l.ran_at, p.full_name as quem, sf.name as de, st.name as para,
--          l.update_existing, l.created_count, l.updated_count, l.skipped_count, l.image_count
--   from catalog_copy_log l
--   join profiles p on p.id = l.actor_id
--   join stores sf on sf.id = l.from_store
--   join stores st on st.id = l.to_store
--   order by l.ran_at desc;
