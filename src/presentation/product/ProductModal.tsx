import { useState, type ChangeEvent } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Plus } from 'lucide-react'
import { toast } from 'sonner'
import { productSchema, type ProductFormInput } from '../../application/product/productSchema'
import type { Product } from '../../domain/product/Product'
import { uploadProductImage } from '../../infrastructure/storage/uploadProductImage'
import { CategoryModal } from '../category/CategoryModal'
import { useCategoryList } from '../category/useCategories'
import { useLinkAddonGroupToProduct } from './addons/useAddons'
import { ProductAddonGroupsSection, type DraftAddonLink } from './addons/ProductAddonGroupsSection'
import { useLinkVariationGroupToProduct } from './variations/useVariations'
import { ProductVariationGroupsSection } from './variations/ProductVariationGroupsSection'
import { Button } from '../ui/Button'
import { Checkbox } from '../ui/Checkbox'
import { Combobox } from '../ui/Combobox'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogTitle } from '../ui/Dialog'
import { Input } from '../ui/Input'
import { Label } from '../ui/Label'
import { inputClass } from '../ui/styles'
import { useSaveProduct } from './useProducts'

const emptyDefaults: ProductFormInput = {
  externalCode: '',
  name: '',
  description: '',
  price: 0,
  loverPrice: 0,
  trackStock: true,
  stockQuantity: 0,
  categoryId: null,
  availableDineIn: true,
  availablePickup: true,
  availableDelivery: false,
  availableReseller: false,
  imageUrl: '',
  ncm: '',
  unit: '',
  costPrice: undefined,
  sortOrder: 0,
  active: true,
}

function toDefaults(product: Product): ProductFormInput {
  return {
    ...product,
    ncm: product.ncm ?? '',
    unit: product.unit ?? '',
    categoryId: product.categoryId,
    description: product.description ?? '',
    imageUrl: product.imageUrl ?? '',
    costPrice: product.costPrice ?? undefined,
  }
}

export function ProductModal({
  storeId,
  product,
  onClose,
}: {
  storeId: string
  product?: Product
  onClose: () => void
}) {
  const saveProduct = useSaveProduct()
  const linkVariationGroup = useLinkVariationGroupToProduct()
  const linkAddonGroup = useLinkAddonGroupToProduct()
  const { data: categories } = useCategoryList(storeId)
  const [imageError, setImageError] = useState<string | null>(null)
  const [isUploadingImage, setIsUploadingImage] = useState(false)
  const [isCreatingCategory, setIsCreatingCategory] = useState(false)
  const [draftVariationGroupIds, setDraftVariationGroupIds] = useState<string[]>([])
  const [draftAddonLinks, setDraftAddonLinks] = useState<DraftAddonLink[]>([])
  // Rastreia o produto já criado nesse fluxo — se o vínculo de adicional/variação falhar depois de
  // criar, um reenvio precisa fazer UPDATE (não CREATE de novo), senão duplica external_code.
  const [createdProduct, setCreatedProduct] = useState<Product | undefined>(product)

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    control,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(productSchema),
    defaultValues: product ? toDefaults(product) : emptyDefaults,
  })

  const trackStock = watch('trackStock')
  const imageUrl = watch('imageUrl')
  const categoryId = watch('categoryId')
  const currentCategory = categories?.find((category) => category.id === categoryId)
  const categoryOptions = (categories ?? [])
    .filter((category) => category.active)
    .map((category) => ({ value: category.id, label: category.name }))

  async function handleImageChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return
    setImageError(null)
    setIsUploadingImage(true)
    try {
      const url = await uploadProductImage(storeId, file)
      setValue('imageUrl', url, { shouldValidate: true })
    } catch (error) {
      setImageError(error instanceof Error ? error.message : 'Falha ao enviar imagem')
    } finally {
      setIsUploadingImage(false)
    }
  }

  async function onSubmit(input: ProductFormInput) {
    let savedProduct: Product
    try {
      savedProduct = await saveProduct.mutateAsync({
        id: createdProduct?.id,
        storeId,
        input: {
          ...input,
          ncm: input.ncm || null,
          unit: input.unit || null,
          categoryId: input.categoryId,
          // category (texto) fica gravado junto, espelhando o nome da categoria escolhida — main
          // em produção e o storefront ainda leem esse campo direto, nunca ficou opcional de verdade.
          category: categories?.find((category) => category.id === input.categoryId)?.name ?? null,
          description: input.description || null,
          imageUrl: input.imageUrl || null,
          costPrice: input.costPrice ?? null,
          stockQuantity: input.trackStock ? input.stockQuantity : 0,
        },
      })
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Falha ao salvar produto')
      return
    }

    // Produto já está salvo a partir daqui — qualquer reenvio agora é UPDATE, nunca cria de novo.
    setCreatedProduct(savedProduct)

    if (!product) {
      try {
        await Promise.all([
          ...draftVariationGroupIds.map((variationGroupId) =>
            linkVariationGroup.mutateAsync({ productId: savedProduct.id, variationGroupId }),
          ),
          ...draftAddonLinks.map((link) =>
            linkAddonGroup.mutateAsync({
              productId: savedProduct.id,
              addonGroupId: link.addonGroupId,
              input: { selectionType: link.selectionType, maxQuantity: link.maxQuantity },
            }),
          ),
        ])
      } catch (error) {
        toast.error(
          error instanceof Error
            ? `Produto criado, mas falha ao vincular adicional/variação: ${error.message} — revise abaixo e salve de novo.`
            : 'Produto criado, mas falha ao vincular adicional/variação — revise abaixo e salve de novo.',
        )
        return
      }
    }

    toast.success(product ? 'Produto atualizado.' : 'Produto criado.')
    onClose()
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[85vh] max-w-lg overflow-y-auto scrollbar-hidden">
        <DialogTitle>{createdProduct ? 'Editar produto' : 'Novo produto'}</DialogTitle>
        <DialogDescription>Dados do produto exibido no cardápio.</DialogDescription>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div className="space-y-1">
            <Label htmlFor="externalCode">Código</Label>
            <Input id="externalCode" {...register('externalCode')} />
            {errors.externalCode && <p className="text-sm text-red-600">{errors.externalCode.message}</p>}
          </div>

          <div className="space-y-1">
            <Label htmlFor="product-name">Descrição</Label>
            <Input id="product-name" {...register('name')} />
            {errors.name && <p className="text-sm text-red-600">{errors.name.message}</p>}
          </div>

          <div className="space-y-1">
            <Label htmlFor="description">Descrição detalhada</Label>
            <textarea id="description" className={inputClass} {...register('description')} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label htmlFor="product-price">Valor não lover (R$)</Label>
              <Input id="product-price" type="number" step="0.01" {...register('price')} />
              {errors.price && <p className="text-sm text-red-600">{errors.price.message}</p>}
            </div>
            <div className="space-y-1">
              <Label htmlFor="loverPrice">Valor lover (R$)</Label>
              <Input id="loverPrice" type="number" step="0.01" {...register('loverPrice')} />
              {errors.loverPrice && <p className="text-sm text-red-600">{errors.loverPrice.message}</p>}
            </div>
          </div>

          <div className="space-y-2 rounded-lg bg-secondary/5 p-3">
            <label className="flex items-center gap-2 font-body">
              <Controller
                control={control}
                name="trackStock"
                render={({ field }) => <Checkbox checked={field.value} onCheckedChange={field.onChange} />}
              />
              Controlar estoque desse item
            </label>
            {trackStock && (
              <div className="space-y-1">
                <Label htmlFor="stockQuantity">Estoque</Label>
                <Input id="stockQuantity" type="number" step="any" {...register('stockQuantity')} />
                {errors.stockQuantity && (
                  <p className="text-sm text-red-600">{errors.stockQuantity.message}</p>
                )}
              </div>
            )}
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <Label>Categoria</Label>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsCreatingCategory(true)}
                className="h-7 gap-1 px-2 text-xs"
              >
                <Plus className="h-3 w-3" />
                Nova categoria
              </Button>
            </div>
            {currentCategory && (
              <p className="font-body text-sm text-foreground/70">
                Categoria atual: <span className="font-medium text-foreground">{currentCategory.name}</span>
              </p>
            )}
            <Controller
              control={control}
              name="categoryId"
              render={({ field }) => (
                <Combobox
                  placeholder="Buscar categoria..."
                  emptyLabel="Nenhuma categoria encontrada."
                  options={categoryOptions}
                  onSelect={field.onChange}
                />
              )}
            />
            {errors.categoryId && <p className="text-sm text-red-600">{errors.categoryId.message}</p>}
          </div>

          {isCreatingCategory && (
            <CategoryModal
              storeId={storeId}
              onClose={() => setIsCreatingCategory(false)}
              onCreated={(category) => setValue('categoryId', category.id, { shouldValidate: true })}
            />
          )}

          <fieldset className="space-y-2 rounded-lg bg-secondary/5 p-3">
            <legend className="text-sm font-body mb-1 px-1">Tipo cardápio</legend>
            <label className="flex items-center gap-2 font-body">
              <Controller
                control={control}
                name="availableDineIn"
                render={({ field }) => <Checkbox checked={field.value} onCheckedChange={field.onChange} />}
              />
              Cafeteria
            </label>
            <label className="flex items-center gap-2 font-body">
              <Controller
                control={control}
                name="availablePickup"
                render={({ field }) => <Checkbox checked={field.value} onCheckedChange={field.onChange} />}
              />
              Para levar/entrega
            </label>
            {/* "Delivery" (availableDelivery) não é mais editável aqui — o storefront unificou
                "para levar" e "entrega" num cardápio só, lendo available_pickup. A coluna
                continua no banco (produtos antigos mantêm o valor), só saiu da UI. */}
            <label className="flex items-center gap-2 font-body">
              <Controller
                control={control}
                name="availableReseller"
                render={({ field }) => <Checkbox checked={field.value} onCheckedChange={field.onChange} />}
              />
              Revendedor
            </label>
          </fieldset>

          {createdProduct ? (
            <>
              <ProductVariationGroupsSection storeId={storeId} mode="linked" productId={createdProduct.id} />
              <ProductAddonGroupsSection storeId={storeId} mode="linked" productId={createdProduct.id} />
            </>
          ) : (
            <>
              <ProductVariationGroupsSection
                storeId={storeId}
                mode="draft"
                selectedGroupIds={draftVariationGroupIds}
                onChange={setDraftVariationGroupIds}
              />
              <ProductAddonGroupsSection
                storeId={storeId}
                mode="draft"
                links={draftAddonLinks}
                onChange={setDraftAddonLinks}
              />
            </>
          )}

          <div className="space-y-2">
            <Label htmlFor="imageFile">Foto</Label>
            <input type="hidden" {...register('imageUrl')} />
            {imageUrl && (
              <div className="flex items-center gap-3">
                <img src={imageUrl} alt="Prévia do produto" className="h-24 w-24 rounded-lg object-cover" />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setValue('imageUrl', '', { shouldValidate: true })}
                >
                  Remover foto
                </Button>
              </div>
            )}
            <input
              id="imageFile"
              type="file"
              accept="image/*"
              disabled={isUploadingImage}
              onChange={handleImageChange}
              className={inputClass}
            />
            {isUploadingImage && <p className="text-sm font-body">Enviando imagem...</p>}
            {imageError && <p className="text-sm text-red-600">{imageError}</p>}
          </div>

          <label className="flex items-center gap-2 font-body">
            <Controller
              control={control}
              name="active"
              render={({ field }) => <Checkbox checked={field.value} onCheckedChange={field.onChange} />}
            />
            Produto ativo
          </label>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
