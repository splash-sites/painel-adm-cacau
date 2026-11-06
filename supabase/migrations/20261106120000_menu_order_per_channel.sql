-- Organizar cardápio por canal: Cafeteria (sort_order, já existente) passa a conviver com
-- Para levar/entrega (sort_order_pickup) e Revendedor (sort_order_reseller), cada um com sua
-- própria ordem de categoria e de produto. Valor inicial = cópia do sort_order atual (Cafeteria),
-- pra loja ajustar os outros 2 canais a partir de onde já estava, sem bagunçar nada hoje.

ALTER TABLE public.products
    ADD COLUMN sort_order_pickup integer DEFAULT 0 NOT NULL,
    ADD COLUMN sort_order_reseller integer DEFAULT 0 NOT NULL;

UPDATE public.products
SET sort_order_pickup = sort_order,
    sort_order_reseller = sort_order;

ALTER TABLE public.categories
    ADD COLUMN sort_order_pickup integer DEFAULT 0 NOT NULL,
    ADD COLUMN sort_order_reseller integer DEFAULT 0 NOT NULL;

UPDATE public.categories
SET sort_order_pickup = sort_order,
    sort_order_reseller = sort_order;

-- public_products: adiciona as 2 colunas novas no final do SELECT (CREATE OR REPLACE VIEW não
-- aceita remover/reordenar coluna existente, só pode crescer no final) — mantém grants atuais
-- (SELECT,MAINTAIN pra anon/authenticated, sem INSERT/UPDATE/DELETE).
CREATE OR REPLACE VIEW public.public_products AS
 SELECT id,
    store_id,
    name,
    ncm,
    unit,
    category,
    description,
    image_url,
    stock_quantity,
    track_stock,
    price,
    lover_price,
    sort_order,
    active,
    created_at,
    available_dine_in,
    available_pickup,
    available_delivery,
    available_reseller,
    category_id,
        CASE
            WHEN available_reseller THEN reseller_stock_quantity
            ELSE NULL::numeric
        END AS reseller_stock_quantity,
        CASE
            WHEN available_reseller THEN reseller_track_stock
            ELSE NULL::boolean
        END AS reseller_track_stock,
    sort_order_pickup,
    sort_order_reseller
   FROM public.products;
