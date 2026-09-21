-- ============================================================================
-- Feature: Estoque do revendedor  (ver CLAUDE.md — "Feature: Aba Revendedores")
-- Cópia de referência — o que roda de verdade está no Supabase (SQL Editor).
-- Ao alterar lá, atualize este arquivo e commite junto.
--
-- Mudança 100% aditiva (coluna com default + triggers novos): produção (main) e
-- storefront atuais continuam funcionando sem nenhuma alteração de código.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Coluna de estoque do canal revendedor (separada de stock_quantity)
--    stock_quantity continua sendo o estoque "normal"; este é o saldo reservado
--    pro canal revendedor.
--    reseller_track_stock é o liga/desliga PRÓPRIO do canal — independe de
--    products.track_stock (estoque normal). Default false: nenhum produto passa a
--    bloquear pedido de revendedor até alguém ligar o controle na aba Revendedores.
-- ----------------------------------------------------------------------------
alter table products
  add column if not exists reseller_stock_quantity numeric not null default 0
  check (reseller_stock_quantity >= 0);

alter table products
  add column if not exists reseller_track_stock boolean not null default false;

-- ----------------------------------------------------------------------------
-- 2. Helper: aplica um delta no saldo do revendedor (delta < 0 = baixa)
--    - baixa é atômica (UPDATE condicional) — 2 pedidos simultâneos nunca
--      passam do saldo
--    - produto com reseller_track_stock = false não é controlado: nunca bloqueia nem baixa
--    - security definer: o cliente que insere o pedido (customer/anon via
--      confirm_order) não tem permissão de UPDATE em products
--    - não é chamável direto por sessão nenhuma (só pelos triggers abaixo)
-- ----------------------------------------------------------------------------
drop function if exists reseller_stock_apply(uuid, numeric);

create or replace function reseller_stock_apply(p_product_id uuid, p_store_id uuid, p_delta numeric)
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

revoke execute on function reseller_stock_apply(uuid, uuid, numeric) from public, anon, authenticated;

-- ----------------------------------------------------------------------------
-- 3. Trigger em order_items: baixa/estorna conforme o item entra, muda de
--    quantidade ou sai — só pra pedido com sales_channel = 'reseller'.
--    Funciona pra qualquer origem de escrita (confirm_order do storefront,
--    add/update/remove_order_item do admin) sem mexer em nenhuma RPC.
--    Pedido cancelado já teve o saldo devolvido (trigger 4): não estorna 2x.
-- ----------------------------------------------------------------------------
create or replace function order_items_reseller_stock_trg()
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

drop trigger if exists order_items_reseller_stock on order_items;
create trigger order_items_reseller_stock
  after insert or update of quantity or delete on order_items
  for each row execute function order_items_reseller_stock_trg();

-- ----------------------------------------------------------------------------
-- 4. Trigger em orders: cancelar devolve ao saldo tudo que o pedido tinha baixado
--    (cancelado é terminal — não existe "voltar de cancelado", então não há
--    caminho inverso pra re-baixar).
-- ----------------------------------------------------------------------------
create or replace function orders_reseller_stock_restore_trg()
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
    perform reseller_stock_apply(r.product_id, new.store_id, r.qty);
  end loop;
  return new;
end;
$$;

drop trigger if exists orders_reseller_stock_restore on orders;
create trigger orders_reseller_stock_restore
  after update of status on orders
  for each row
  when (new.status = 'cancelled' and old.status <> 'cancelled' and new.sales_channel = 'reseller')
  execute function orders_reseller_stock_restore_trg();

-- ----------------------------------------------------------------------------
-- 5. CONFERIR (não roda sozinho): se a view public_products lista as colunas
--    explicitamente (em vez de "select * except cost_price/external_code"), o
--    storefront só enxerga reseller_stock_quantity depois de recriar a view
--    incluindo a coluna nova. Sem isso ele não consegue mostrar "esgotado".
--      select pg_get_viewdef('public_products'::regclass, true);
-- ----------------------------------------------------------------------------
