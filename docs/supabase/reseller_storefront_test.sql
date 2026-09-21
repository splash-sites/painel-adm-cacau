-- ============================================================================
-- Teste do canal revendedor (rodar DEPOIS de reseller_stock.sql e reseller_storefront.sql)
--
-- COMO LER O RESULTADO: o SQL Editor do Supabase não mostra RAISE NOTICE, então o
-- relatório sai numa mensagem de ERRO no fim ("RESULTADO DO TESTE: ..."). Esse erro é
-- proposital: ele desfaz a transação inteira, então NENHUM pedido nem alteração de saldo
-- fica no banco. Cada linha do relatório começa com "OK" ou "FALHOU".
-- ============================================================================
do $$
declare
  v_store   uuid;
  v_product uuid;
  v_order   uuid;
  v_saldo   numeric;
  v_items   jsonb;
  v_report  text := '';
begin
  -- Produto sem variação obrigatória, de loja que atende revendedor, liberado pro canal
  -- e sem bloqueio de estoque normal (o varejo do teste também precisa passar).
  select p.store_id, p.id into v_store, v_product
  from products p
  join stores s on s.id = p.store_id
  where s.active and s.reseller_enabled
    and p.active and p.available_reseller and p.available_pickup
    and (not p.track_stock or p.stock_quantity > 0)
    and not exists (select 1 from product_variation_groups g where g.product_id = p.id)
  limit 1;

  if v_product is null then
    raise exception 'RESULTADO DO TESTE: FALHOU — nenhum produto elegível (precisa de loja com reseller_enabled + produto com Revendedor e Para levar marcados, sem variação obrigatória)';
  end if;

  update products set reseller_track_stock = true, reseller_stock_quantity = 5 where id = v_product;
  v_report := v_report || format(E'Produto de teste %s, saldo inicial 5\n', v_product);

  -- 1) Varejo: NÃO pode mexer no saldo do revendedor
  drop table if exists combo_item_prices;
  v_items := jsonb_build_array(jsonb_build_object('product_id', v_product, 'quantity', 2));
  perform confirm_order(v_store, 'pickup', 'Teste', '12345678901', '11999999999', null, v_items, null, 'retail');
  select reseller_stock_quantity into v_saldo from products where id = v_product;
  v_report := v_report || format(E'%s 1) Varejo (2 un.): saldo do revendedor = %s (esperado 5)\n',
    case when v_saldo = 5 then 'OK    ' else 'FALHOU' end, v_saldo);

  -- 2) Revendedor: baixa o saldo
  drop table if exists combo_item_prices;
  v_order := confirm_order(v_store, 'pickup', 'Teste', '12345678901', '11999999999', null, v_items, null, 'reseller');
  select reseller_stock_quantity into v_saldo from products where id = v_product;
  v_report := v_report || format(E'%s 2) Revendedor (2 un.): saldo = %s (esperado 3)\n',
    case when v_saldo = 3 then 'OK    ' else 'FALHOU' end, v_saldo);

  -- 3) Revendedor acima do saldo: tem que bloquear
  drop table if exists combo_item_prices;
  begin
    perform confirm_order(
      v_store, 'pickup', 'Teste', '12345678901', '11999999999', null,
      jsonb_build_array(jsonb_build_object('product_id', v_product, 'quantity', 10)), null, 'reseller'
    );
    v_report := v_report || E'FALHOU 3) pedido de 10 un. com saldo 3 não foi bloqueado\n';
  exception when others then
    v_report := v_report || format(E'OK     3) Acima do saldo bloqueado: %s\n', sqlerrm);
  end;

  -- 4) dine_in com canal revendedor: tem que bloquear
  drop table if exists combo_item_prices;
  begin
    perform confirm_order(v_store, 'dine_in', 'Teste', '12345678901', '11999999999', null, v_items, '1', 'reseller');
    v_report := v_report || E'FALHOU 4) dine_in + revendedor não foi bloqueado\n';
  exception when others then
    v_report := v_report || format(E'OK     4) dine_in + revendedor bloqueado: %s\n', sqlerrm);
  end;

  -- 5) Quantidade zero: tem que bloquear
  drop table if exists combo_item_prices;
  begin
    perform confirm_order(
      v_store, 'pickup', 'Teste', '12345678901', '11999999999', null,
      jsonb_build_array(jsonb_build_object('product_id', v_product, 'quantity', 0)), null, 'retail'
    );
    v_report := v_report || E'FALHOU 5) quantidade 0 não foi bloqueada\n';
  exception when others then
    v_report := v_report || format(E'OK     5) Quantidade 0 bloqueada: %s\n', sqlerrm);
  end;

  -- 6) Cancelar o pedido do revendedor devolve o saldo
  update orders set status = 'cancelled' where id = v_order;
  select reseller_stock_quantity into v_saldo from products where id = v_product;
  v_report := v_report || format(E'%s 6) Cancelar pedido do revendedor: saldo = %s (esperado 5)\n',
    case when v_saldo = 5 then 'OK    ' else 'FALHOU' end, v_saldo);

  -- 7) Controle desligado: revendedor não baixa nem bloqueia
  update products set reseller_track_stock = false where id = v_product;
  drop table if exists combo_item_prices;
  perform confirm_order(
    v_store, 'pickup', 'Teste', '12345678901', '11999999999', null,
    jsonb_build_array(jsonb_build_object('product_id', v_product, 'quantity', 50)), null, 'reseller'
  );
  select reseller_stock_quantity into v_saldo from products where id = v_product;
  v_report := v_report || format(E'%s 7) Controle desligado (50 un.): saldo = %s (esperado 5, sem bloquear)\n',
    case when v_saldo = 5 then 'OK    ' else 'FALHOU' end, v_saldo);

  -- Erro proposital: desfaz tudo (nada fica no banco) e entrega o relatório na mensagem.
  raise exception E'RESULTADO DO TESTE (erro proposital, nada foi gravado):\n%', v_report;
end $$;
