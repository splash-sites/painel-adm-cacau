import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useNavigate } from 'react-router-dom'
import {
  setupFirstAdminSchema,
  type SetupFirstAdminInput,
} from '../../application/admin/setupFirstAdminSchema'
import { AuthSplitLayout, authButtonClass, authInputClass, authLabelClass } from '../auth/AuthSplitLayout'
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

  const intro =
    'Esta tela só funciona uma vez, para criar a conta de quem vai administrar o sistema. Depois, novos usuários são criados dentro do painel, em "Usuários".'

  if (success) {
    return (
      <AuthSplitLayout title="Primeiro acesso" description={intro}>
        <div className="flex flex-col gap-4">
          <h2 className="font-display text-[28px] font-bold">Conta criada</h2>
          <p>Já pode entrar com o e-mail e a senha que você cadastrou.</p>
          <button type="button" onClick={() => navigate('/login')} className={authButtonClass}>
            Ir para o login
          </button>
        </div>
      </AuthSplitLayout>
    )
  }

  return (
    <AuthSplitLayout title="Primeiro acesso" description={intro}>
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
        <h2 className="font-display text-[28px] font-bold">Criar administrador</h2>

        <label htmlFor="fullName" className={authLabelClass}>
          Seu nome
          <input id="fullName" autoComplete="name" className={authInputClass} {...register('fullName')} />
          {errors.fullName && <span className="text-sm text-danger">{errors.fullName.message}</span>}
        </label>

        <label htmlFor="email" className={authLabelClass}>
          E-mail
          <input id="email" type="email" autoComplete="email" className={authInputClass} {...register('email')} />
          {errors.email && <span className="text-sm text-danger">{errors.email.message}</span>}
        </label>

        <label htmlFor="password" className={authLabelClass}>
          Senha
          <input
            id="password"
            type="password"
            autoComplete="new-password"
            className={authInputClass}
            {...register('password')}
          />
          {errors.password ? (
            <span className="text-sm text-danger">{errors.password.message}</span>
          ) : (
            <span className="text-[13px]">Pelo menos 6 caracteres.</span>
          )}
        </label>

        {submitError && (
          <p role="alert" className="text-sm text-danger">
            {submitError}
          </p>
        )}

        <button type="submit" disabled={isSubmitting} className={authButtonClass}>
          {isSubmitting ? 'Criando...' : 'Criar conta'}
        </button>
      </form>
    </AuthSplitLayout>
  )
}
