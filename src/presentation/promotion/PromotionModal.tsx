import { useId, useState, type ChangeEvent } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { promotionSchema, type PromotionFormInput } from '../../application/promotion/promotionSchema'
import type { Promotion } from '../../domain/promotion/Promotion'
import { uploadPromotionImage } from '../../infrastructure/storage/uploadPromotionImage'
import { useProduct, useProductSearch } from '../product/useProducts'
import { Button } from '../ui/Button'
import { Checkbox } from '../ui/Checkbox'
import { Combobox } from '../ui/Combobox'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogTitle } from '../ui/Dialog'
import { Input } from '../ui/Input'
import { Label } from '../ui/Label'
import { inputClass } from '../ui/styles'
import { useDebouncedValue } from '../ui/useDebouncedValue'
import { useSavePromotion } from './usePromotions'

const emptyDefaults: PromotionFormInput = {
  title: '',
  subtitle: '',
  badgeLabel: '',
  imageUrl: '',
  productId: '',
  active: true,
}

function toDefaults(promotion: Promotion): PromotionFormInput {
  return {
    title: promotion.title,
    subtitle: promotion.subtitle ?? '',
    badgeLabel: promotion.badgeLabel ?? '',
    imageUrl: promotion.imageUrl,
    productId: promotion.productId,
    active: promotion.active,
  }
}

export function PromotionModal({
  storeId,
  promotion,
  onClose,
}: {
  storeId: string
  promotion?: Promotion
  onClose: () => void
}) {
  const savePromotion = useSavePromotion()
  const [imageError, setImageError] = useState<string | null>(null)
  const [isUploadingImage, setIsUploadingImage] = useState(false)
  const [productQuery, setProductQuery] = useState('')
  const debouncedProductQuery = useDebouncedValue(productQuery, 250)
  const { data: productResults } = useProductSearch(storeId, debouncedProductQuery)
  const titleId = useId()
  const subtitleId = useId()
  const badgeLabelId = useId()
  const imageFileId = useId()

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    control,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(promotionSchema),
    defaultValues: promotion ? toDefaults(promotion) : emptyDefaults,
  })

  const imageUrl = watch('imageUrl')
  const productId = watch('productId')
  const { data: currentProduct } = useProduct(productId || undefined)

  async function handleImageChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return
    setImageError(null)
    setIsUploadingImage(true)
    try {
      const url = await uploadPromotionImage(storeId, file)
      setValue('imageUrl', url, { shouldValidate: true })
    } catch (error) {
      setImageError(error instanceof Error ? error.message : 'Falha ao enviar imagem')
    } finally {
      setIsUploadingImage(false)
    }
  }

  async function onSubmit(input: PromotionFormInput) {
    try {
      await savePromotion.mutateAsync({
        id: promotion?.id,
        storeId,
        input: {
          title: input.title,
          subtitle: input.subtitle || null,
          badgeLabel: input.badgeLabel || null,
          imageUrl: input.imageUrl,
          productId: input.productId,
          active: input.active,
        },
      })
      toast.success(promotion ? 'Promoção atualizada.' : 'Promoção criada.')
      onClose()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Falha ao salvar promoção')
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[85vh] max-w-lg overflow-y-auto scrollbar-hidden">
        <DialogTitle>{promotion ? 'Editar promoção' : 'Nova promoção'}</DialogTitle>
        <DialogDescription>Item do carrossel de promoções do cardápio do cliente.</DialogDescription>

        <form
          onSubmit={(event) => {
            event.stopPropagation()
            void handleSubmit(onSubmit)(event)
          }}
          className="space-y-4"
          noValidate
        >
          <div className="space-y-1">
            <Label htmlFor={titleId}>Título</Label>
            <Input id={titleId} {...register('title')} />
            {errors.title && <p className="text-sm text-red-600">{errors.title.message}</p>}
          </div>

          <div className="space-y-1">
            <Label htmlFor={subtitleId}>Subtítulo (opcional)</Label>
            <Input id={subtitleId} {...register('subtitle')} />
          </div>

          <div className="space-y-1">
            <Label htmlFor={badgeLabelId}>Selo (opcional)</Label>
            <Input id={badgeLabelId} placeholder='Ex: "Combo especial", "Só hoje"' {...register('badgeLabel')} />
          </div>

          <div className="space-y-1">
            <Label>Produto vinculado</Label>
            {currentProduct && (
              <p className="font-body text-sm text-foreground/70">
                Produto atual: <span className="font-medium text-foreground">{currentProduct.name}</span>
              </p>
            )}
            <Controller
              control={control}
              name="productId"
              render={({ field }) => (
                <Combobox
                  placeholder="Buscar produto..."
                  emptyLabel="Nenhum produto ativo encontrado."
                  options={(productResults ?? []).map((product) => ({ value: product.id, label: product.name }))}
                  onQueryChange={setProductQuery}
                  onSelect={field.onChange}
                />
              )}
            />
            {errors.productId && <p className="text-sm text-red-600">{errors.productId.message}</p>}
            <p className="text-xs text-foreground/50">
              Preço sempre vem do produto ao vivo — a promoção não guarda preço próprio.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor={imageFileId}>Imagem</Label>
            <input type="hidden" {...register('imageUrl')} />
            {imageUrl && (
              <div className="flex items-center gap-3">
                <img src={imageUrl} alt="Prévia da promoção" className="h-24 w-24 rounded-lg object-cover" />
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
              id={imageFileId}
              type="file"
              accept="image/*"
              disabled={isUploadingImage}
              onChange={handleImageChange}
              className={inputClass}
            />
            {isUploadingImage && <p className="text-sm font-body">Enviando imagem...</p>}
            {imageError && <p className="text-sm text-red-600">{imageError}</p>}
            {errors.imageUrl && <p className="text-sm text-red-600">{errors.imageUrl.message}</p>}
          </div>

          <label className="flex items-center gap-2 font-body">
            <Controller
              control={control}
              name="active"
              render={({ field }) => <Checkbox checked={field.value} onCheckedChange={field.onChange} />}
            />
            Promoção ativa
          </label>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting || isUploadingImage}>
              {isSubmitting ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
