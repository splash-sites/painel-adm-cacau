import { useId, useState, type ChangeEvent } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { promotionSchema, type PromotionFormInput } from '../../application/promotion/promotionSchema'
import type { Promotion } from '../../domain/promotion/Promotion'
import { calculatePromotionBaseTotal, calculatePromotionDiscountedTotal } from '../../domain/promotion/promotionPricing'
import { uploadPromotionImage } from '../../infrastructure/storage/uploadPromotionImage'
import { formatCurrency } from '../order/orderCardFormat'
import { useProduct, useProductSearch } from '../product/useProducts'
import { Button } from '../ui/Button'
import { Checkbox } from '../ui/Checkbox'
import { Combobox } from '../ui/Combobox'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogTitle } from '../ui/Dialog'
import { Input } from '../ui/Input'
import { Label } from '../ui/Label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/Select'
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
  discountType: null,
  discountValue: null,
}

function toDefaults(promotion: Promotion): PromotionFormInput {
  return {
    title: promotion.title,
    subtitle: promotion.subtitle ?? '',
    badgeLabel: promotion.badgeLabel ?? '',
    imageUrl: promotion.imageUrl,
    productId: promotion.productId,
    active: promotion.active,
    discountType: promotion.discountType,
    discountValue: promotion.discountValue,
  }
}

interface ComboItemDraft {
  productId: string
  productName: string
  price: number
  quantity: number
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
  const [comboItems, setComboItems] = useState<ComboItemDraft[]>(
    promotion?.comboItems.map(({ productId, productName, price, quantity }) => ({
      productId,
      productName,
      price,
      quantity,
    })) ?? [],
  )
  const [comboQuery, setComboQuery] = useState('')
  const debouncedComboQuery = useDebouncedValue(comboQuery, 250)
  const { data: comboResults } = useProductSearch(storeId, debouncedComboQuery)
  const titleId = useId()
  const subtitleId = useId()
  const badgeLabelId = useId()
  const imageFileId = useId()
  const discountValueId = useId()

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
  const discountType = watch('discountType')
  const discountValue = watch('discountValue')
  const { data: currentProduct } = useProduct(productId || undefined)

  const baseTotal = currentProduct ? calculatePromotionBaseTotal(currentProduct.price, comboItems) : null
  const discountedTotal =
    baseTotal != null
      ? calculatePromotionDiscountedTotal(baseTotal, { discountType, discountValue: discountValue as number | null })
      : null

  const comboOptions = (comboResults ?? [])
    .filter((product) => product.id !== productId && !comboItems.some((item) => item.productId === product.id))
    .map((product) => ({ value: product.id, label: product.name }))

  function handleAddComboItem(selectedId: string) {
    const product = comboResults?.find((item) => item.id === selectedId)
    if (!product) return
    setComboItems((items) => [
      ...items,
      { productId: product.id, productName: product.name, price: product.price, quantity: 1 },
    ])
  }

  function handleRemoveComboItem(productIdToRemove: string) {
    setComboItems((items) => items.filter((item) => item.productId !== productIdToRemove))
  }

  function handleComboItemQuantityChange(productIdToUpdate: string, quantity: number) {
    setComboItems((items) =>
      items.map((item) => (item.productId === productIdToUpdate ? { ...item, quantity } : item)),
    )
  }

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
          discountType: input.discountType,
          discountValue: input.discountValue,
          comboItems: comboItems.map(({ productId: id, quantity }) => ({ productId: id, quantity })),
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
            <Label>Produto principal</Label>
            {currentProduct && (
              <p className="font-body text-sm text-foreground/70">
                Produto atual: <span className="font-medium text-foreground">{currentProduct.name}</span> ·{' '}
                {formatCurrency(currentProduct.price)}
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
              Imagem e texto do card sempre giram em torno desse produto — preço vem sempre ao vivo, a promoção
              não guarda preço próprio.
            </p>
          </div>

          <div className="space-y-2 rounded-lg bg-secondary/5 p-3">
            <Label>Combo — produtos extras (opcional)</Label>
            <p className="text-sm font-body text-foreground/60">
              Deixe vazio pra uma promoção de 1 produto só. Adicionando produto(s) aqui, vira um combo — o
              desconto (se marcado abaixo) aplica sobre a soma do produto principal + esses itens extras.
            </p>
            <Combobox
              placeholder="Buscar produto pra adicionar..."
              emptyLabel="Nenhum produto ativo encontrado."
              options={comboOptions}
              onQueryChange={setComboQuery}
              onSelect={handleAddComboItem}
            />
            {comboItems.length > 0 && (
              <ul className="space-y-1.5 pt-1">
                {comboItems.map((item) => (
                  <li key={item.productId} className="flex items-center justify-between gap-2 text-sm font-body">
                    <span className="min-w-0 truncate">
                      {item.productName} <span className="text-foreground/50">· {formatCurrency(item.price)}</span>
                    </span>
                    <div className="flex shrink-0 items-center gap-2">
                      <Input
                        type="number"
                        min={1}
                        className="w-16"
                        value={item.quantity}
                        onChange={(event) =>
                          handleComboItemQuantityChange(item.productId, Math.max(1, Number(event.target.value)))
                        }
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveComboItem(item.productId)}
                        className="text-xs text-red-700 hover:underline"
                      >
                        Remover
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            {currentProduct && baseTotal != null && (
              <p className="pt-1 text-sm font-body text-foreground/70">
                Total do produto{comboItems.length > 0 ? ' + combo' : ''}: <span className="font-medium text-foreground">{formatCurrency(baseTotal)}</span>
              </p>
            )}
          </div>

          <div className="space-y-2 rounded-lg bg-secondary/5 p-3">
            <label className="flex items-center gap-2 font-body">
              <Checkbox
                checked={discountType !== null}
                onCheckedChange={(checked) =>
                  setValue('discountType', checked ? 'percent' : null, { shouldValidate: true })
                }
              />
              Aplicar desconto
            </label>
            {discountType && (
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div className="space-y-1">
                  <Label>Tipo</Label>
                  <Controller
                    control={control}
                    name="discountType"
                    render={({ field }) => (
                      <Select value={field.value ?? 'percent'} onValueChange={field.onChange}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="percent">Percentual (%)</SelectItem>
                          <SelectItem value="fixed_amount">Valor fixo (R$)</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor={discountValueId}>{discountType === 'percent' ? 'Percentual' : 'Valor (R$)'}</Label>
                  <Input id={discountValueId} type="number" step="0.01" {...register('discountValue')} />
                </div>
              </div>
            )}
            {errors.discountValue && <p className="text-sm text-red-600">{errors.discountValue.message}</p>}
            {discountType && discountedTotal != null && baseTotal != null && (
              <p className="pt-1 text-sm font-body">
                Total com desconto: <span className="font-medium">{formatCurrency(discountedTotal)}</span>{' '}
                <span className="text-foreground/50 line-through">{formatCurrency(baseTotal)}</span>
              </p>
            )}
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
