import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import {
  updateAdminProfileSchema,
  type UpdateAdminProfileInput,
} from '../../application/admin/updateAdminProfileSchema'
import type { AdminUser } from '../../application/admin/AdminUserRepository'
import { useAuth } from '../auth/useAuth'
import { Button } from '../ui/Button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogTitle } from '../ui/Dialog'
import { Input } from '../ui/Input'
import { Label } from '../ui/Label'
import { Switch } from '../ui/Switch'
import { useUpdateAdminProfile, useUpdateAdminUser } from './useAdminUsers'

export function EditAdminProfileModal({ admin, onClose }: { admin: AdminUser; onClose: () => void }) {
  const { session } = useAuth()
  const updateAdminProfile = useUpdateAdminProfile()
  const updateAdminUser = useUpdateAdminUser()
  const [active, setActive] = useState(admin.active)

  const canToggleActive = admin.role !== 'super_admin' && admin.id !== session?.profile.id

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<UpdateAdminProfileInput>({
    resolver: zodResolver(updateAdminProfileSchema),
    defaultValues: { fullName: admin.fullName ?? '', email: admin.email ?? '', password: '' },
  })

  async function onSubmit(input: UpdateAdminProfileInput) {
    try {
      await updateAdminProfile.mutateAsync({ id: admin.id, input })
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Falha ao atualizar usuário')
      return
    }

    if (canToggleActive && active !== admin.active) {
      try {
        await updateAdminUser.mutateAsync({ id: admin.id, input: { active } })
      } catch (error) {
        toast.error(
          error instanceof Error
            ? `Nome/e-mail/senha salvos, mas falha ao mudar status ativo: ${error.message}`
            : 'Nome/e-mail/senha salvos, mas falha ao mudar status ativo — tente de novo.',
        )
        return
      }
    }

    toast.success('Usuário atualizado.')
    onClose()
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogTitle>Editar {admin.fullName ?? 'usuário'}</DialogTitle>
        <DialogDescription>Nome, e-mail e senha. Papel e loja são definidos só na criação.</DialogDescription>

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
            <Input
              id="password"
              type="password"
              placeholder="Deixe em branco pra manter a atual"
              {...register('password')}
            />
            {errors.password && <p className="text-sm text-red-600">{errors.password.message}</p>}
          </div>

          {canToggleActive && (
            <div className="flex items-center justify-between pt-1">
              <span className="font-body">Conta ativa</span>
              <Switch checked={active} onCheckedChange={setActive} />
            </div>
          )}

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
