import { useEffect } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { createAdminSchema, type CreateAdminInput } from '../../application/admin/createAdminSchema'
import { useEffectiveStoreId } from '../storeContext/useEffectiveStoreId'
import { useStore } from '../store/useStores'
import { Button } from '../ui/Button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogTitle } from '../ui/Dialog'
import { Input } from '../ui/Input'
import { Label } from '../ui/Label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/Select'
import { useCreateAdmin } from './useCreateAdmin'

const ROLE_LABEL = {
  store_admin: 'Colaborador',
  super_admin: 'Administrador',
} as const

function emptyDefaults(storeId: string): CreateAdminInput {
  return { fullName: '', email: '', password: '', role: 'store_admin', storeId }
}

export function CreateAdminModal({ onClose }: { onClose: () => void }) {
  const effectiveStoreId = useEffectiveStoreId()
  const { data: activeStore } = useStore(effectiveStoreId || undefined)
  const createAdmin = useCreateAdmin()

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    control,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(createAdminSchema),
    defaultValues: emptyDefaults(effectiveStoreId),
  })

  const role = watch('role')

  useEffect(() => {
    setValue('storeId', effectiveStoreId)
  }, [effectiveStoreId, setValue])

  async function onSubmit(input: CreateAdminInput) {
    try {
      await createAdmin.mutateAsync({
        fullName: input.fullName,
        email: input.email,
        password: input.password,
        role: input.role,
        storeId: input.role === 'store_admin' ? input.storeId : undefined,
      })
      toast.success(`Conta de ${input.fullName} criada.`)
      reset(emptyDefaults(effectiveStoreId))
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Falha ao cadastrar usuário')
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogTitle>Cadastrar usuário</DialogTitle>
        <DialogDescription>Nome, e-mail, senha e papel. Depois de criado, só nome/e-mail/senha mudam.</DialogDescription>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div className="space-y-1">
            <Label htmlFor="fullName">Nome</Label>
            <Input id="fullName" {...register('fullName')} />
            {errors.fullName && <p className="text-sm text-red-600">{errors.fullName.message}</p>}
          </div>

          <div className="space-y-1">
            <Label htmlFor="email">E-mail</Label>
            <Input id="email" type="email" {...register('email')} />
            {errors.email && <p className="text-sm text-red-600">{errors.email.message}</p>}
          </div>

          <div className="space-y-1">
            <Label htmlFor="password">Senha</Label>
            <Input id="password" type="password" {...register('password')} />
            {errors.password && <p className="text-sm text-red-600">{errors.password.message}</p>}
          </div>

          <div className="space-y-1">
            <Label htmlFor="role">Papel</Label>
            <Controller
              control={control}
              name="role"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="role">
                    <SelectValue>{ROLE_LABEL[field.value]}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="store_admin">Colaborador</SelectItem>
                    <SelectItem value="super_admin">Administrador</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          {role === 'store_admin' && (
            <div className="space-y-1">
              <span className="text-sm font-body">Loja</span>
              <p className="text-sm font-body text-foreground/70">
                {activeStore ? activeStore.name : 'Selecione uma loja no seletor antes de cadastrar.'}
              </p>
              {errors.storeId && <p className="text-sm text-red-600">{errors.storeId.message}</p>}
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Fechar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Cadastrando...' : 'Cadastrar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
