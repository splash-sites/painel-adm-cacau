import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useNavigate } from 'react-router-dom'
import { loginSchema, type LoginInput } from '../../application/auth/loginSchema'
import { inputClass } from '../ui/styles'
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
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="w-full max-w-sm space-y-5 rounded-2xl bg-white p-8 shadow-lg"
        noValidate
      >
        <div>
          <h1 className="font-display text-3xl text-accent">Splash Pedidos</h1>
          <p className="text-sm font-body text-foreground/50">Painel administrativo</p>
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
            autoComplete="current-password"
            className={inputClass}
            {...register('password')}
          />
          {errors.password && <p className="text-sm text-red-600">{errors.password.message}</p>}
        </div>

        {authError && <p className="text-sm text-red-600">{authError}</p>}

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded-lg bg-accent px-4 py-2.5 font-medium font-body text-accent-foreground transition hover:brightness-110 disabled:opacity-50 disabled:pointer-events-none"
        >
          {isSubmitting ? 'Entrando...' : 'Entrar'}
        </button>
      </form>
    </div>
  )
}
