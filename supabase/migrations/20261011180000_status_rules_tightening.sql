-- change_order_status: duas travas que esperavam o painel em produção acompanhar (conferido
-- 2026-10-11 na main: o modal de cancelar já exige motivo, e o fluxo já passa por "delivered").
-- 1) Cancelar exige motivo (antes: aceitava p_reason vazio/nulo).
-- 2) Sai a compatibilidade com o front antigo: out_for_delivery -> finalized e, na mesa,
--    preparing -> finalized. Finalizar agora só a partir de "delivered".
-- Mesma assinatura (create or replace substitui).

create or replace function public.change_order_status(p_order_id uuid, p_new_status text, p_attendant_id uuid DEFAULT NULL::uuid, p_reason text DEFAULT NULL::text) RETURNS void
    LANGUAGE plpgsql
    SET search_path = public, pg_temp
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
    if nullif(btrim(p_reason), '') is null then
      raise exception 'Informe o motivo do cancelamento';
    end if;
  else
    v_allowed := case
      when v_status = 'received' then array['preparing']
      when v_status = 'preparing' and v_order_type = 'dine_in' then array['delivered']
      when v_status = 'preparing' then array['out_for_delivery']
      when v_status = 'out_for_delivery' then array['delivered']
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
    set status = p_new_status, updated_at = now(), cancellation_reason = btrim(p_reason)
    where id = p_order_id;
  else
    update orders set status = p_new_status, updated_at = now() where id = p_order_id;
  end if;

  insert into order_status_history (order_id, status, changed_by, changed_at)
  values (p_order_id, p_new_status, auth.uid(), now());
end;
$$;
