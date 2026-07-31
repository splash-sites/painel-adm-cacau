import { z } from 'zod'

export const loginSchema = z.object({
  email: z.string().email('E-mail inválido'),
  password: z.string().min(6, 'Senha precisa de pelo menos 6 caracteres'),
})

export type LoginInput = z.infer<typeof loginSchema>
