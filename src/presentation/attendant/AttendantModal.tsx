import { useId } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { attendantSchema, type AttendantFormInput } from '../../application/attendant/attendantSchema'
import type { Attendant } from '../../domain/attendant/Attendant'
import { Button } from '../ui/Button'
import { Checkbox } from '../ui/Checkbox'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogTitle } from '../ui/Dialog'
import { Input } from '../ui/Input'
import { Label } from '../ui/Label'
import { useSaveAttendant } from './useAttendants'

const emptyDefaults: AttendantFormInput = { name: '', active: true }

export function AttendantModal({
  storeId,
  attendant,
  onClose,
  onCreated,
}: {
  storeId: string
  attendant?: Attendant
  onClose: () => void
  onCreated?: (attendant: Attendant) => void
}) {
  const saveAttendant = useSaveAttendant()
  const nameId = useId()

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(attendantSchema),
    defaultValues: attendant ? { name: attendant.name, active: attendant.active } : emptyDefaults,
  })

  async function onSubmit(input: AttendantFormInput) {
    try {
      const saved = await saveAttendant.mutateAsync({ id: attendant?.id, storeId, input })
      toast.success(attendant ? 'Atendente atualizado.' : 'Atendente criado.')
      onClose()
      if (!attendant && saved) onCreated?.(saved)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Falha ao salvar atendente')
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogTitle>{attendant ? 'Editar atendente' : 'Novo atendente'}</DialogTitle>
        <DialogDescription>Quem prepara o pedido — sem login, só nome.</DialogDescription>

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
            Atendente ativo
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
