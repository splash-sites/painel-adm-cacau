-- Opções dentro de cada grupo de adicional/variação saíam ordenadas por id nas views
-- do cardápio: a ordem arrastada no painel (sort_order) não chegava ao cliente.
-- Mesmas colunas, só o ORDER BY muda (create or replace mantém os grants/revokes).

create or replace view public.public_product_addon_groups as
 select pag.product_id,
    pag.sort_order,
    pag.selection_type,
    pag.max_quantity,
    ag.id as group_id,
    ag.name as group_name,
    coalesce(( select jsonb_agg(jsonb_build_object('id', ao.id, 'name', ao.name, 'price', ao.price, 'lover_price', ao.lover_price) order by ao.sort_order, ao.id) as jsonb_agg
           from public.addon_options ao
          where ((ao.group_id = ag.id) and (ao.active = true))), '[]'::jsonb) as options
   from (public.product_addon_groups pag
     join public.addon_groups ag on ((ag.id = pag.addon_group_id)))
  where (ag.active = true);

create or replace view public.public_product_variation_groups as
 select pvg.product_id,
    pvg.sort_order,
    vg.id as group_id,
    vg.name as group_name,
    vg.price_mode,
    coalesce(( select jsonb_agg(jsonb_build_object('id', vo.id, 'name', vo.name, 'price', vo.price, 'lover_price', vo.lover_price) order by vo.sort_order, vo.id) as jsonb_agg
           from public.variation_options vo
          where ((vo.group_id = vg.id) and (vo.active = true))), '[]'::jsonb) as options
   from (public.product_variation_groups pvg
     join public.variation_groups vg on ((vg.id = pvg.variation_group_id)))
  where (vg.active = true);
