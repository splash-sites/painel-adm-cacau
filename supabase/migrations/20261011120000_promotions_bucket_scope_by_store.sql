-- Upload no bucket `promotions` passa a exigir a loja certa, igual ao `product-images`.
-- Antes: qualquer usuario logado (inclusive conta `customer` criada pelo cadastro
-- publico) podia enviar arquivo pra pasta de qualquer loja.
-- Agora: super_admin em qualquer pasta; store_admin so na pasta da propria loja
-- (o painel grava em `${storeId}/${uuid}-${nome}`, ver uploadPromotionImage.ts).

drop policy if exists "Store admin upload promotions images" on storage.objects;

create policy "promotions images upload scoped by store"
  on storage.objects
  as permissive
  for insert
  to authenticated
  with check (
    bucket_id = 'promotions'
    and (
      public."current_role"() = 'super_admin'
      or (
        public."current_role"() = 'store_admin'
        and (storage.foldername(name))[1] = (public.current_store_id())::text
      )
    )
  );
