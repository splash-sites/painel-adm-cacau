-- Estoque do varejo passa a contar unidades (decidido 2026-10-11).
-- Antes: track_stock ligado só recusava pedido com saldo já em 0 (checagem no
-- confirm_order) e nunca descontava. Agora, igual ao estoque da revenda:
--   pedido desconta, edição de item ajusta, remoção/cancelamento devolve,
--   e pedido acima do saldo é recusado.
-- Triggers separados dos da revenda (que já funcionam na produção): estes só
-- olham pedido com sales_channel = 'retail' e mexem em stock_quantity/track_stock.
-- track_stock desligado continua ignorando estoque.

create or replace function public.retail_stock_apply(p_product_id uuid, p_store_id uuid, p_delta numeric)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rows int;
  v_name text;
begin
  if p_delta = 0 then
    return;
  end if;

  -- Roda como owner (sem RLS): o produto tem que ser da loja do pedido.
  if not exists (select 1 from products where id = p_product_id and store_id = p_store_id) then
    raise exception 'Produto não pertence à loja do pedido' using errcode = 'P0001';
  end if;

  if p_delta > 0 then
    update products
       set stock_quantity = stock_quantity + p_delta
     where id = p_product_id
       and store_id = p_store_id
       and track_stock;
    return;
  end if;

  update products
     set stock_quantity = stock_quantity + p_delta
   where id = p_product_id
     and store_id = p_store_id
     and track_stock
     and stock_quantity >= -p_delta;
  get diagnostics v_rows = row_count;

  if v_rows = 0 then
    select name into v_name from products where id = p_product_id and store_id = p_store_id and track_stock;
    if found then
      raise exception 'Estoque insuficiente para "%"', v_name using errcode = 'P0001';
    end if;
    -- produto sem controle de estoque: nada a baixar
  end if;
end;
$$;

create or replace function public.order_items_retail_stock_trg()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_channel text;
  v_status  text;
  v_store   uuid;
begin
  if tg_op = 'INSERT' then
    select sales_channel, status, store_id into v_channel, v_status, v_store from orders where id = new.order_id;
    if v_channel = 'retail' and v_status <> 'cancelled' then
      -- quantidade <= 0 viraria delta positivo e SOMARIA no saldo
      if new.quantity <= 0 then
        raise exception 'Quantidade do item deve ser maior que zero' using errcode = 'P0001';
      end if;
      perform retail_stock_apply(new.product_id, v_store, -new.quantity);
    end if;
    return new;
  end if;

  if tg_op = 'UPDATE' then
    if new.quantity is distinct from old.quantity then
      select sales_channel, status, store_id into v_channel, v_status, v_store from orders where id = new.order_id;
      if v_channel = 'retail' and v_status <> 'cancelled' then
        if new.quantity <= 0 then
          raise exception 'Quantidade do item deve ser maior que zero' using errcode = 'P0001';
        end if;
        perform retail_stock_apply(new.product_id, v_store, old.quantity - new.quantity);
      end if;
    end if;
    return new;
  end if;

  -- DELETE (pedido apagado em cascata não acha o pedido: não devolve, igual à revenda)
  select sales_channel, status, store_id into v_channel, v_status, v_store from orders where id = old.order_id;
  if found and v_channel = 'retail' and v_status <> 'cancelled' then
    perform retail_stock_apply(old.product_id, v_store, old.quantity);
  end if;
  return old;
end;
$$;

create or replace function public.orders_retail_stock_restore_trg()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
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
    perform retail_stock_apply(r.product_id, new.store_id, r.qty);
  end loop;
  return new;
end;
$$;

-- Só rodam via trigger.
revoke all on function public.retail_stock_apply(uuid, uuid, numeric) from public, anon, authenticated;
revoke all on function public.order_items_retail_stock_trg() from public, anon, authenticated;
revoke all on function public.orders_retail_stock_restore_trg() from public, anon, authenticated;

create trigger order_items_retail_stock
after insert or delete or update of quantity on public.order_items
for each row execute function public.order_items_retail_stock_trg();

create trigger orders_retail_stock_restore
after update of status on public.orders
for each row
when (new.status = 'cancelled' and old.status <> 'cancelled' and new.sales_channel = 'retail')
execute function public.orders_retail_stock_restore_trg();
