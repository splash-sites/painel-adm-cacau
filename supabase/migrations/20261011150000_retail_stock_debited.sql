-- Correção do estoque do varejo (20261011140000), achada no security-sweep antes de ir pra produção:
-- a devolução (remover item, diminuir quantidade, cancelar) devolvia order_items.quantity
-- inteiro, mesmo quando nada tinha sido descontado — pedido aberto antes da virada, ou
-- produto que estava com track_stock desligado quando o pedido entrou e foi ligado depois.
-- Resultado: estoque inflava. Agora cada item guarda quanto descontou de fato
-- (retail_stock_debited) e só isso volta.
--
-- Junto: update_order_item_quantity era SECURITY DEFINER sem conferir quem chama e
-- liberada pra anon — com o estoque contando, quem soubesse o id de um item de outra
-- loja mexeria no saldo dela. Vira SECURITY INVOKER (o RLS de order_items decide).

alter table public.order_items
  add column retail_stock_debited numeric not null default 0;

-- Retorno passa a dizer se descontou/devolveu de fato (troca de tipo exige drop).
drop function public.retail_stock_apply(uuid, uuid, numeric);

create function public.retail_stock_apply(p_product_id uuid, p_store_id uuid, p_delta numeric)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_rows int;
  v_name text;
begin
  -- Roda como owner (sem RLS): o produto tem que ser da loja do pedido.
  if not exists (select 1 from products where id = p_product_id and store_id = p_store_id) then
    raise exception 'Produto não pertence à loja do pedido' using errcode = 'P0001';
  end if;

  if p_delta = 0 then
    return false;
  end if;

  if p_delta > 0 then
    update products
       set stock_quantity = stock_quantity + p_delta
     where id = p_product_id
       and store_id = p_store_id
       and track_stock;
    get diagnostics v_rows = row_count;
    return v_rows > 0;
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
    return false; -- produto sem controle de estoque: nada a baixar
  end if;
  return true;
end;
$$;

revoke all on function public.retail_stock_apply(uuid, uuid, numeric) from public, anon, authenticated;

-- Item: BEFORE pra poder gravar retail_stock_debited na própria linha.
drop trigger order_items_retail_stock on public.order_items;
drop function public.order_items_retail_stock_trg();

create function public.order_items_retail_stock_trg()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_channel text;
  v_status  text;
  v_store   uuid;
begin
  if tg_op = 'INSERT' then
    new.retail_stock_debited := 0;
    select sales_channel, status, store_id into v_channel, v_status, v_store from orders where id = new.order_id;
    if v_channel = 'retail' and v_status <> 'cancelled' then
      if new.quantity <= 0 then
        raise exception 'Quantidade do item deve ser maior que zero' using errcode = 'P0001';
      end if;
      if retail_stock_apply(new.product_id, v_store, -new.quantity) then
        new.retail_stock_debited := new.quantity;
      end if;
    end if;
    return new;
  end if;

  if tg_op = 'UPDATE' then
    select sales_channel, status, store_id into v_channel, v_status, v_store from orders where id = new.order_id;
    -- Débito não muda por UPDATE direto. Única exceção: zerar em pedido já cancelado
    -- (é o que orders_retail_stock_restore_trg faz depois de devolver).
    if not (v_status = 'cancelled' and new.retail_stock_debited = 0) then
      new.retail_stock_debited := old.retail_stock_debited;
    end if;
    if new.quantity is distinct from old.quantity then
      if v_channel = 'retail' and v_status <> 'cancelled' then
        if new.quantity <= 0 then
          raise exception 'Quantidade do item deve ser maior que zero' using errcode = 'P0001';
        end if;
        -- Devolve o que tinha sido descontado e desconta a quantidade nova (tudo na mesma transação).
        if old.retail_stock_debited > 0 then
          perform retail_stock_apply(old.product_id, v_store, old.retail_stock_debited);
        end if;
        new.retail_stock_debited := 0;
        if retail_stock_apply(new.product_id, v_store, -new.quantity) then
          new.retail_stock_debited := new.quantity;
        end if;
      end if;
    end if;
    return new;
  end if;

  -- DELETE: devolve só o que foi descontado (pedido apagado em cascata não acha o pedido: não devolve)
  if old.retail_stock_debited > 0 then
    select sales_channel, status, store_id into v_channel, v_status, v_store from orders where id = old.order_id;
    if found and v_channel = 'retail' and v_status <> 'cancelled' then
      perform retail_stock_apply(old.product_id, v_store, old.retail_stock_debited);
    end if;
  end if;
  return old;
end;
$$;

revoke all on function public.order_items_retail_stock_trg() from public, anon, authenticated;

create trigger order_items_retail_stock_ins_upd
before insert or update on public.order_items
for each row execute function public.order_items_retail_stock_trg();

create trigger order_items_retail_stock_del
after delete on public.order_items
for each row execute function public.order_items_retail_stock_trg();

-- Cancelamento: devolve só o descontado e zera, pra nunca devolver duas vezes.
create or replace function public.orders_retail_stock_restore_trg()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  r record;
begin
  for r in
    select product_id, sum(retail_stock_debited) as qty
      from order_items
     where order_id = new.id
       and retail_stock_debited > 0
     group by product_id
     order by product_id
  loop
    perform retail_stock_apply(r.product_id, new.store_id, r.qty);
  end loop;
  update order_items set retail_stock_debited = 0 where order_id = new.id and retail_stock_debited > 0;
  return new;
end;
$$;

-- update_order_item_quantity: o RLS decide quem mexe (store_admin só a própria loja).
alter function public.update_order_item_quantity(uuid, integer) security invoker;
revoke execute on function public.update_order_item_quantity(uuid, integer) from public, anon;
