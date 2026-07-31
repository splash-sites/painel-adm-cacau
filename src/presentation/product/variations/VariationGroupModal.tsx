import { useId } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { variationGroupSchema, type VariationGroupFormInput } from '../../../application/product/variationSchema'
import type { VariationGroup } from '../../../domain/product/Variation'
import { Button } from '../../ui/Button'
import { Checkbox } from '../../ui/Checkbox'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogTitle } from '../../ui/Dialog'
import { Input } from '../../ui/Input'
import { Label } from '../../ui/Label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/Select'
import { useSaveVariationGroup } from './useVariations'

const emptyDefaults: VariationGroupFormInput = { name: '', active: true, priceMode: 'additive' }

export function VariationGroupModal({
  storeId,
  group,
  onClose,
  onCreated,
}: {
  storeId: string
  group?: VariationGroup
  onClose: () => void
  onCreated?: (group: VariationGroup) => void
}) {
  const saveGroup = useSaveVariationGroup()
  const nameId = useId()

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(variationGroupSchema),
    defaultValues: group
      ? { name: group.name, active: group.active, priceMode: group.priceMode }
      : emptyDefaults,
  })

  async function onSubmit(input: VariationGroupFormInput) {
    try {
      const saved = await saveGroup.mutateAsync({ id: group?.id, storeId, input })
      toast.success(group ? 'Grupo atualizado.' : 'Grupo criado.')
      onClose()
      if (!group && saved) onCreated?.(saved)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Falha ao salvar grupo')
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogTitle>{group ? 'Editar grupo de variação' : 'Novo grupo de variação'}</DialogTitle>
        <DialogDescription>
          Ex: "Sabor" ou "Intensidade" — sempre obrigatório quando vinculado a um produto.
        </DialogDescription>

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
            <Label>Efeito no preço</Label>
            <p className="text-sm font-body text-foreground/60">
              Ex: "Tamanho" substitui (Grande vira o preço final); "Intensidade" soma ou não muda nada.
            </p>
            <Controller
              control={control}
              name="priceMode"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="additive">Soma ao preço base (ou não altera, se R$0)</SelectItem>
                    <SelectItem value="replace">Substitui o preço base</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          <label className="flex items-center gap-2 font-body">
            <Controller
              control={control}
              name="active"
              render={({ field }) => <Checkbox checked={field.value} onCheckedChange={field.onChange} />}
            />
            Grupo ativo
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
