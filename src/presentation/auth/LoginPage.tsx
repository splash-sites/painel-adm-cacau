import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useNavigate } from 'react-router-dom'
import { loginSchema, type LoginInput } from '../../application/auth/loginSchema'
import { AuthSplitLayout, authButtonClass, authInputClass, authLabelClass } from './AuthSplitLayout'
import { useAuth } from './useAuth'

export function LoginPage() {
  const { signIn, refetchSession } = useAuth()
  const navigate = useNavigate()
  const [authError, setAuthError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({ resolver: zodResolver(loginSchema) })

  async function onSubmit(input: LoginInput) {
    setAuthError(null)
    try {
      await signIn(input.email, input.password)
      await refetchSession()
      navigate('/', { replace: true })
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : 'Não foi possível entrar')
    }
  }

  return (
    <AuthSplitLayout
      title="Os pedidos da loja num lugar só."
      description="Cardápio, quadro de pedidos e relatórios de cada loja."
    >
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-[18px]" noValidate>
        <h2 className="font-display text-[30px] font-bold">Entrar</h2>

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
            autoComplete="current-password"
            className={authInputClass}
            {...register('password')}
          />
          {errors.password && <span className="text-sm text-danger">{errors.password.message}</span>}
        </label>

        {authError && (
          <p role="alert" className="text-sm text-danger">
            {authError}
          </p>
        )}

        <button type="submit" disabled={isSubmitting} className={authButtonClass}>
          {isSubmitting ? 'Entrando...' : 'Entrar'}
        </button>
        <p className="text-[13px] text-muted">Esqueceu a senha? Peça para o administrador da sua loja.</p>
      </form>
    </AuthSplitLayout>
  )
}
