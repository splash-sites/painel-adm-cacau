import { useId } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { categorySchema, type CategoryFormInput } from '../../application/category/categorySchema'
import type { Category } from '../../domain/category/Category'
import { Button } from '../ui/Button'
import { Checkbox } from '../ui/Checkbox'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogTitle } from '../ui/Dialog'
import { Input } from '../ui/Input'
import { Label } from '../ui/Label'
import { useSaveCategory } from './useCategories'

const emptyDefaults: CategoryFormInput = { name: '', active: true }

export function CategoryModal({
  storeId,
  category,
  onClose,
  onCreated,
}: {
  storeId: string
  category?: Category
  onClose: () => void
  onCreated?: (category: Category) => void
}) {
  const saveCategory = useSaveCategory()
  const nameId = useId()

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(categorySchema),
    defaultValues: category ? { name: category.name, active: category.active } : emptyDefaults,
  })

  async function onSubmit(input: CategoryFormInput) {
    try {
      const saved = await saveCategory.mutateAsync({ id: category?.id, storeId, input })
      toast.success(category ? 'Categoria atualizada.' : 'Categoria criada.')
      onClose()
      if (!category && saved) onCreated?.(saved)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Falha ao salvar categoria')
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogTitle>{category ? 'Editar categoria' : 'Nova categoria'}</DialogTitle>
        <DialogDescription>Como o produto aparece agrupado no cardápio.</DialogDescription>

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
            Categoria ativa
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
