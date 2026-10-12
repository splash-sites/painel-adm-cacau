-- "Meus pedidos" (cardápio) somava só unit_price × quantidade e o total ficava sem os
-- adicionais (pedido de R$ 45,00 aparecia como R$ 40,00). Cada item passa a trazer:
--   addons_unit_price: soma dos adicionais por unidade (price × quantity do adicional)
--   addons: nomes dos adicionais, pra mostrar junto do item
-- Total do item = (unit_price + addons_unit_price) × quantity — mesma regra do painel
-- (unit_price já vem com variação e desconto de combo; nunca reaplicar).
--
-- Mesma assinatura e mesmo tipo de retorno (items continua jsonb): só ganha chaves novas,
-- então o cardápio em produção, que ignora as chaves, segue funcionando.
-- Continua sem devolver endereço.

create or replace function public.list_orders_by_cpf(p_store_id uuid, p_customer_cpf text)
returns table(id uuid, order_type text, status text, table_number text, created_at timestamp with time zone, items jsonb)
language sql
security definer
set search_path to 'public'
as $$
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
        'note', oi.notes,
        'addons_unit_price', coalesce((
          select sum(a.price * a.quantity) from order_item_addons a where a.order_item_id = oi.id
        ), 0),
        'addons', coalesce((
          select jsonb_agg(a.name order by a.created_at, a.id) from order_item_addons a where a.order_item_id = oi.id
        ), '[]'::jsonb)
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
