-- Dados FALSOS pro ambiente de staging. Nunca rodar na producao.
-- Idempotente: ids fixos + ON CONFLICT DO NOTHING (rodar de novo nao duplica).
-- Usuario de login nao e criado aqui (cria pelo dashboard do Supabase,
-- Authentication -> Add user); a promocao a super_admin e feita a parte.

-- Triggers do schema (ex: products_category_store_check) usam nome de tabela sem
-- schema e dependem do search_path de quem chama.
set search_path = public, extensions;

-- ===== Lojas =====
insert into public.stores (id, name, slug, active, supports_dine_in, supports_pickup, supports_delivery, reseller_enabled, whatsapp_number) values
  ('00000000-0000-4000-a000-000000000001', 'Loja Teste A', 'loja-a', true, true, true, true, true, '5551999990001'),
  ('00000000-0000-4000-a000-000000000002', 'Loja Teste B', 'loja-b', true, true, true, false, false, '5551999990002')
on conflict (id) do nothing;

-- ===== Categorias =====
insert into public.categories (id, store_id, name, sort_order) values
  ('00000000-0000-4000-b000-0000000000a1', '00000000-0000-4000-a000-000000000001', 'Cafés', 1),
  ('00000000-0000-4000-b000-0000000000a2', '00000000-0000-4000-a000-000000000001', 'Doces', 2),
  ('00000000-0000-4000-b000-0000000000a3', '00000000-0000-4000-a000-000000000001', 'Bebidas', 3),
  ('00000000-0000-4000-b000-0000000000b1', '00000000-0000-4000-a000-000000000002', 'Cafés', 1),
  ('00000000-0000-4000-b000-0000000000b2', '00000000-0000-4000-a000-000000000002', 'Doces', 2)
on conflict (id) do nothing;

-- ===== Produtos =====
-- Loja A cobre os casos: lover_price, estoque controlado, sem estoque, inativo,
-- so cafeteria, revenda com estoque proprio.
insert into public.products (id, store_id, external_code, name, category, category_id, description, unit,
  price, lover_price, cost_price, stock_quantity, track_stock, active, sort_order,
  available_dine_in, available_pickup, available_delivery, available_reseller,
  reseller_stock_quantity, reseller_track_stock) values
  ('00000000-0000-4000-c000-0000000000a1', '00000000-0000-4000-a000-000000000001', 'A001', 'Cappuccino', 'Cafés', '00000000-0000-4000-b000-0000000000a1', 'Café, leite vaporizado e canela', 'UN', 16.00, 14.00, 5.00, 0, false, true, 1, true, true, false, true, 50, true),
  ('00000000-0000-4000-c000-0000000000a2', '00000000-0000-4000-a000-000000000001', 'A002', 'Café expresso', 'Cafés', '00000000-0000-4000-b000-0000000000a1', 'Expresso curto', 'UN', 8.00, 6.90, 2.00, 0, false, true, 2, true, true, false, false, 0, false),
  ('00000000-0000-4000-c000-0000000000a3', '00000000-0000-4000-a000-000000000001', 'A003', 'Fondue de chocolate', 'Doces', '00000000-0000-4000-b000-0000000000a2', 'Fondue com frutas (escolha o tamanho)', 'UN', 30.00, 27.00, 10.00, 0, false, true, 1, true, false, false, false, 0, false),
  ('00000000-0000-4000-c000-0000000000a4', '00000000-0000-4000-a000-000000000001', 'A004', 'Trufa ao leite', 'Doces', '00000000-0000-4000-b000-0000000000a2', 'Trufa recheada', 'UN', 6.00, 5.00, 1.50, 20, true, true, 2, true, true, false, true, 3, true),
  ('00000000-0000-4000-c000-0000000000a5', '00000000-0000-4000-a000-000000000001', 'A005', 'Brownie (sem estoque)', 'Doces', '00000000-0000-4000-b000-0000000000a2', 'Testa item esgotado', 'UN', 12.00, 10.00, 3.00, 0, true, true, 3, true, true, false, false, 0, false),
  ('00000000-0000-4000-c000-0000000000a6', '00000000-0000-4000-a000-000000000001', 'A006', 'Água com gás', 'Bebidas', '00000000-0000-4000-b000-0000000000a3', '500ml', 'UN', 5.00, 4.00, 1.00, 0, false, true, 1, true, true, false, true, 100, true),
  ('00000000-0000-4000-c000-0000000000a7', '00000000-0000-4000-a000-000000000001', 'A007', 'Produto inativo', 'Bebidas', '00000000-0000-4000-b000-0000000000a3', 'Nao pode aparecer no cardapio', 'UN', 9.00, 8.00, 2.00, 0, false, false, 2, true, true, false, false, 0, false),
  ('00000000-0000-4000-c000-0000000000b1', '00000000-0000-4000-a000-000000000002', 'B001', 'Mocha', 'Cafés', '00000000-0000-4000-b000-0000000000b1', 'Café com chocolate (loja B)', 'UN', 18.00, 16.00, 6.00, 0, false, true, 1, true, true, false, false, 0, false),
  ('00000000-0000-4000-c000-0000000000b2', '00000000-0000-4000-a000-000000000002', 'B002', 'Bombom', 'Doces', '00000000-0000-4000-b000-0000000000b2', 'Bombom sortido (loja B)', 'UN', 4.00, 3.50, 1.00, 0, false, true, 1, true, true, false, false, 0, false)
on conflict (id) do nothing;

-- ===== Variacao (Fondue: tamanho, replace) =====
insert into public.variation_groups (id, store_id, name, price_mode, sort_order) values
  ('00000000-0000-4000-d000-0000000000a1', '00000000-0000-4000-a000-000000000001', 'Tamanho', 'replace', 1)
on conflict (id) do nothing;
insert into public.variation_options (id, group_id, name, price, lover_price, sort_order) values
  ('00000000-0000-4000-d100-0000000000a1', '00000000-0000-4000-d000-0000000000a1', 'Pequeno', 24.00, 21.00, 1),
  ('00000000-0000-4000-d100-0000000000a2', '00000000-0000-4000-d000-0000000000a1', 'Grande', 36.00, 32.00, 2)
on conflict (id) do nothing;
insert into public.product_variation_groups (product_id, variation_group_id, sort_order) values
  ('00000000-0000-4000-c000-0000000000a3', '00000000-0000-4000-d000-0000000000a1', 1)
on conflict do nothing;

-- ===== Adicionais (Fondue + Cappuccino) =====
insert into public.addon_groups (id, store_id, name, sort_order) values
  ('00000000-0000-4000-e000-0000000000a1', '00000000-0000-4000-a000-000000000001', 'Cobertura extra', 1),
  ('00000000-0000-4000-e000-0000000000a2', '00000000-0000-4000-a000-000000000001', 'Leite', 2)
on conflict (id) do nothing;
insert into public.addon_options (id, group_id, name, price, lover_price, sort_order) values
  ('00000000-0000-4000-e100-0000000000a1', '00000000-0000-4000-e000-0000000000a1', 'Granulado', 4.00, 3.50, 1),
  ('00000000-0000-4000-e100-0000000000a2', '00000000-0000-4000-e000-0000000000a1', 'Chocolate branco', 5.00, 4.50, 2),
  ('00000000-0000-4000-e100-0000000000a3', '00000000-0000-4000-e000-0000000000a2', 'Leite sem lactose', 2.00, 2.00, 1),
  ('00000000-0000-4000-e100-0000000000a4', '00000000-0000-4000-e000-0000000000a2', 'Leite vegetal', 3.00, 2.50, 2)
on conflict (id) do nothing;
insert into public.product_addon_groups (product_id, addon_group_id, selection_type, max_quantity, sort_order) values
  ('00000000-0000-4000-c000-0000000000a3', '00000000-0000-4000-e000-0000000000a1', 'multiple', 2, 1),
  ('00000000-0000-4000-c000-0000000000a1', '00000000-0000-4000-e000-0000000000a2', 'single', null, 1)
on conflict do nothing;

-- ===== Promocao com combo e desconto (loja A) =====
insert into public.promotions (id, store_id, title, subtitle, badge_label, image_url, product_id, sort_order, active, discount_type, discount_value) values
  ('00000000-0000-4000-f000-0000000000a1', '00000000-0000-4000-a000-000000000001', 'Combo café + trufa', 'Cappuccino com trufa ao leite', 'Combo especial', 'https://placehold.co/800x400/2C120B/F0ECD2?text=Combo+teste', '00000000-0000-4000-c000-0000000000a1', 1, true, 'percent', 10)
on conflict (id) do nothing;
insert into public.promotion_combo_items (id, promotion_id, product_id, quantity) values
  ('00000000-0000-4000-f100-0000000000a1', '00000000-0000-4000-f000-0000000000a1', '00000000-0000-4000-c000-0000000000a4', 1)
on conflict (id) do nothing;

-- ===== Atendentes =====
insert into public.attendants (id, store_id, name) values
  ('00000000-0000-4000-9000-0000000000a1', '00000000-0000-4000-a000-000000000001', 'Atendente A1'),
  ('00000000-0000-4000-9000-0000000000a2', '00000000-0000-4000-a000-000000000001', 'Atendente A2'),
  ('00000000-0000-4000-9000-0000000000b1', '00000000-0000-4000-a000-000000000002', 'Atendente B1')
on conflict (id) do nothing;

-- ===== Loja dos testes E2E (Playwright) — dados que os specs esperam =====
-- cacau-cardapio/e2e/*.spec.ts usam a loja `loja-e2e`: produto "Água" (sem
-- variacao/adicional), "Fondue" (2 variacoes obrigatorias: fruta + chocolate;
-- adicional multiplo "Adc Fondue": Bytes, Granulado) e a promocao
-- "TESTE - Fondue com desconto" (Fondue + Água, desconto fixo).
-- painel-adm-cacau/e2e cria o proprio pedido nessa loja antes de rodar.
insert into public.stores (id, name, slug, active, supports_dine_in, supports_pickup, supports_delivery, reseller_enabled, whatsapp_number) values
  ('00000000-0000-4000-a000-000000000003', 'Loja E2E', 'loja-e2e', true, true, true, true, false, null)
on conflict (id) do nothing;

insert into public.categories (id, store_id, name, sort_order) values
  ('00000000-0000-4000-b000-0000000000e1', '00000000-0000-4000-a000-000000000003', 'Doces', 1),
  ('00000000-0000-4000-b000-0000000000e2', '00000000-0000-4000-a000-000000000003', 'Bebidas', 2)
on conflict (id) do nothing;

insert into public.products (id, store_id, external_code, name, category, category_id, description, unit,
  price, lover_price, cost_price, stock_quantity, track_stock, active, sort_order,
  available_dine_in, available_pickup, available_delivery, available_reseller) values
  ('00000000-0000-4000-c000-0000000000e1', '00000000-0000-4000-a000-000000000003', 'E001', 'Fondue', 'Doces', '00000000-0000-4000-b000-0000000000e1', 'Fondue de teste', 'UN', 26.00, 23.00, 8.00, 0, false, true, 1, true, true, false, false),
  ('00000000-0000-4000-c000-0000000000e2', '00000000-0000-4000-a000-000000000003', 'E002', 'Água', 'Bebidas', '00000000-0000-4000-b000-0000000000e2', '500ml', 'UN', 5.00, 4.00, 1.00, 0, false, true, 1, true, true, false, false)
on conflict (id) do nothing;

insert into public.variation_groups (id, store_id, name, price_mode, sort_order) values
  ('00000000-0000-4000-d000-0000000000e1', '00000000-0000-4000-a000-000000000003', 'Fruta', 'replace', 1),
  ('00000000-0000-4000-d000-0000000000e2', '00000000-0000-4000-a000-000000000003', 'Chocolate', 'additive', 2)
on conflict (id) do nothing;
insert into public.variation_options (id, group_id, name, price, lover_price, sort_order) values
  ('00000000-0000-4000-d100-0000000000e1', '00000000-0000-4000-d000-0000000000e1', 'Banana', 24.00, 21.00, 1),
  ('00000000-0000-4000-d100-0000000000e2', '00000000-0000-4000-d000-0000000000e1', 'Morango', 28.00, 25.00, 2),
  ('00000000-0000-4000-d100-0000000000e3', '00000000-0000-4000-d000-0000000000e2', 'Chocolate preto', 0, 0, 1),
  ('00000000-0000-4000-d100-0000000000e4', '00000000-0000-4000-d000-0000000000e2', 'Chocolate branco', 2.00, 2.00, 2)
on conflict (id) do nothing;
insert into public.product_variation_groups (product_id, variation_group_id, sort_order) values
  ('00000000-0000-4000-c000-0000000000e1', '00000000-0000-4000-d000-0000000000e1', 1),
  ('00000000-0000-4000-c000-0000000000e1', '00000000-0000-4000-d000-0000000000e2', 2)
on conflict do nothing;

insert into public.addon_groups (id, store_id, name, sort_order) values
  ('00000000-0000-4000-e000-0000000000e1', '00000000-0000-4000-a000-000000000003', 'Adc Fondue', 1)
on conflict (id) do nothing;
insert into public.addon_options (id, group_id, name, price, lover_price, sort_order) values
  ('00000000-0000-4000-e100-0000000000e1', '00000000-0000-4000-e000-0000000000e1', 'Bytes', 5.00, 4.50, 1),
  ('00000000-0000-4000-e100-0000000000e2', '00000000-0000-4000-e000-0000000000e1', 'Granulado', 4.00, 3.50, 2)
on conflict (id) do nothing;
insert into public.product_addon_groups (product_id, addon_group_id, selection_type, max_quantity, sort_order) values
  ('00000000-0000-4000-c000-0000000000e1', '00000000-0000-4000-e000-0000000000e1', 'multiple', null, 1)
on conflict do nothing;

insert into public.promotions (id, store_id, title, subtitle, badge_label, image_url, product_id, sort_order, active, discount_type, discount_value) values
  ('00000000-0000-4000-f000-0000000000e1', '00000000-0000-4000-a000-000000000003', 'TESTE - Fondue com desconto', 'Combo de teste', 'Combo', 'https://placehold.co/800x400/2C120B/F0ECD2?text=E2E', '00000000-0000-4000-c000-0000000000e1', 1, true, 'fixed_amount', 3)
on conflict (id) do nothing;
insert into public.promotion_combo_items (id, promotion_id, product_id, quantity) values
  ('00000000-0000-4000-f100-0000000000e1', '00000000-0000-4000-f000-0000000000e1', '00000000-0000-4000-c000-0000000000e2', 1)
on conflict (id) do nothing;

insert into public.attendants (id, store_id, name) values
  ('00000000-0000-4000-9000-0000000000e1', '00000000-0000-4000-a000-000000000003', 'Atendente E2E')
on conflict (id) do nothing;
