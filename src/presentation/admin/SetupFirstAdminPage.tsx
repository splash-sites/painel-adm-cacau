import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useNavigate } from 'react-router-dom'
import {
  setupFirstAdminSchema,
  type SetupFirstAdminInput,
} from '../../application/admin/setupFirstAdminSchema'
import { buttonClass, cardClass, inputClass } from '../ui/styles'
import { useSetupFirstAdmin } from './useCreateAdmin'

export function SetupFirstAdminPage() {
  const navigate = useNavigate()
  const setupFirstAdmin = useSetupFirstAdmin()
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SetupFirstAdminInput>({ resolver: zodResolver(setupFirstAdminSchema) })

  async function onSubmit(input: SetupFirstAdminInput) {
    setSubmitError(null)
    try {
      await setupFirstAdmin.mutateAsync(input)
      setSuccess(true)
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Falha ao criar conta inicial')
    }
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-secondary/5 text-foreground p-4">
        <div className={`w-full max-w-sm space-y-4 text-center ${cardClass}`}>
          <h1 className="font-display text-2xl text-accent">Conta criada</h1>
          <p className="font-body">Já pode entrar com o e-mail e senha que você cadastrou.</p>
          <button type="button" onClick={() => navigate('/login')} className={buttonClass('primary')}>
            Ir pro login
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-secondary/5 text-foreground p-4">
      <form onSubmit={handleSubmit(onSubmit)} className={`w-full max-w-sm space-y-5 ${cardClass}`} noValidate>
        <div className="space-y-1">
          <h1 className="font-display text-2xl text-accent">Configuração inicial</h1>
          <p className="text-sm font-body text-foreground/70">
            Cria a primeira conta super_admin. Só funciona uma vez — depois disso, novos usuários se
            cadastram logado, em "Usuários".
          </p>
        </div>

        <div className="space-y-1">
          <label htmlFor="fullName" className="text-sm font-body">
            Nome
          </label>
          <input id="fullName" className={inputClass} {...register('fullName')} />
          {errors.fullName && <p className="text-sm text-red-600">{errors.fullName.message}</p>}
        </div>

        <div className="space-y-1">
          <label htmlFor="email" className="text-sm font-body">
            E-mail
          </label>
          <input id="email" type="email" autoComplete="email" className={inputClass} {...register('email')} />
          {errors.email && <p className="text-sm text-red-600">{errors.email.message}</p>}
        </div>

        <div className="space-y-1">
          <label htmlFor="password" className="text-sm font-body">
            Senha
          </label>
          <input
            id="password"
            type="password"
            autoComplete="new-password"
            className={inputClass}
            {...register('password')}
          />
          {errors.password && <p className="text-sm text-red-600">{errors.password.message}</p>}
        </div>

        {submitError && <p className="text-sm text-red-600">{submitError}</p>}

        <button type="submit" disabled={isSubmitting} className={`w-full ${buttonClass('primary')}`}>
          {isSubmitting ? 'Criando...' : 'Criar conta'}
        </button>
      </form>
    </div>
  )
}
