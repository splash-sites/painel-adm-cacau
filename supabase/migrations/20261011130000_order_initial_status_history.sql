-- Status inicial do pedido no histórico.
-- confirm_order criava o pedido em 'received' mas não gravava essa linha em
-- order_status_history: o histórico começava no 'preparing' e não havia ponto de
-- partida pra medir espera até aceitar. Trigger em vez de mexer no confirm_order:
-- cobre qualquer caminho que crie pedido.

create or replace function public.order_initial_status_history_trg()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into order_status_history (order_id, status, changed_by, changed_at)
  values (new.id, new.status, auth.uid(), new.created_at);
  return new;
end;
$$;

-- Só roda via trigger.
revoke all on function public.order_initial_status_history_trg() from public, anon, authenticated;

create trigger orders_initial_status_history
after insert on public.orders
for each row execute function public.order_initial_status_history_trg();

-- Pedidos antigos: grava o 'received' na hora em que o pedido nasceu
-- (todo pedido nasce em 'received'). Idempotente.
insert into public.order_status_history (order_id, status, changed_by, changed_at)
select o.id, 'received', null, o.created_at
from public.orders o
where not exists (
  select 1 from public.order_status_history h
  where h.order_id = o.id and h.status = 'received'
);
