import { useId } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { addonOptionSchema, type AddonOptionFormInput } from '../../../application/product/addonSchema'
import type { AddonOption } from '../../../domain/product/Addon'
import { Button } from '../../ui/Button'
import { Checkbox } from '../../ui/Checkbox'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogTitle } from '../../ui/Dialog'
import { Input } from '../../ui/Input'
import { Label } from '../../ui/Label'
import { useSaveAddonOption } from './useAddons'

const emptyDefaults: AddonOptionFormInput = { name: '', price: 0, loverPrice: null, active: true }

export function AddonOptionModal({
  groupId,
  option,
  onClose,
}: {
  groupId: string
  option?: AddonOption
  onClose: () => void
}) {
  const saveOption = useSaveAddonOption()
  const nameId = useId()
  const priceId = useId()
  const loverPriceId = useId()

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(addonOptionSchema),
    defaultValues: option
      ? { name: option.name, price: option.price, loverPrice: option.loverPrice, active: option.active }
      : emptyDefaults,
  })

  async function onSubmit(input: AddonOptionFormInput) {
    try {
      await saveOption.mutateAsync({ id: option?.id, groupId, input })
      toast.success(option ? 'Adicional atualizado.' : 'Adicional criado.')
      onClose()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Falha ao salvar adicional')
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogTitle>{option ? 'Editar adicional' : 'Novo adicional'}</DialogTitle>
        <DialogDescription>Ex: "Extra chocolate branco" com preço próprio.</DialogDescription>

        <form
          onSubmit={(event) => {
            event.stopPropagation()
            void handleSubmit(onSubmit)(event)
          }}
          className="space-y-4"
          noValidate
        >
          <div className="space-y-1">
            <Label htmlFor={nameId}>Nome</Label>
            <Input id={nameId} {...register('name')} />
            {errors.name && <p className="text-sm text-red-600">{errors.name.message}</p>}
          </div>

          <div className="space-y-1">
            <Label htmlFor={priceId}>Preço (R$)</Label>
            <Input id={priceId} type="number" step="0.01" {...register('price')} />
            {errors.price && <p className="text-sm text-red-600">{errors.price.message}</p>}
          </div>

          <div className="space-y-1">
            <Label htmlFor={loverPriceId}>Preço lover (R$) — opcional</Label>
            <Input id={loverPriceId} type="number" step="0.01" {...register('loverPrice')} />
            {errors.loverPrice && <p className="text-sm text-red-600">{errors.loverPrice.message}</p>}
            <p className="text-xs text-foreground/50">Deixe em branco se não tiver preço diferenciado.</p>
          </div>

          <label className="flex items-center gap-2 font-body">
            <Controller
              control={control}
              name="active"
              render={({ field }) => <Checkbox checked={field.value} onCheckedChange={field.onChange} />}
            />
            Adicional ativo
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
