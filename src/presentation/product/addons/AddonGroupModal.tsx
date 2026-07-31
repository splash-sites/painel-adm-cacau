import { useId } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { addonGroupSchema, type AddonGroupFormInput } from '../../../application/product/addonSchema'
import type { AddonGroup } from '../../../domain/product/Addon'
import { Button } from '../../ui/Button'
import { Checkbox } from '../../ui/Checkbox'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogTitle } from '../../ui/Dialog'
import { Input } from '../../ui/Input'
import { Label } from '../../ui/Label'
import { useSaveAddonGroup } from './useAddons'

const emptyDefaults: AddonGroupFormInput = { name: '', active: true }

export function AddonGroupModal({
  storeId,
  group,
  onClose,
  onCreated,
}: {
  storeId: string
  group?: AddonGroup
  onClose: () => void
  onCreated?: (group: AddonGroup) => void
}) {
  const saveGroup = useSaveAddonGroup()
  const nameId = useId()

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(addonGroupSchema),
    defaultValues: group ? { name: group.name, active: group.active } : emptyDefaults,
  })

  async function onSubmit(input: AddonGroupFormInput) {
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
        <DialogTitle>{group ? 'Editar grupo de adicionais' : 'Novo grupo de adicionais'}</DialogTitle>
        <DialogDescription>Ex: "Adicionais Waffle" pode servir vários produtos.</DialogDescription>

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
