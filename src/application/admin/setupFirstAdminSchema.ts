import { z } from 'zod'

export const setupFirstAdminSchema = z.object({
  fullName: z.string().min(1, 'Nome obrigatório'),
  email: z.string().email('E-mail inválido'),
  password: z.string().min(6, 'Senha precisa de pelo menos 6 caracteres'),
})

export type SetupFirstAdminInput = z.infer<typeof setupFirstAdminSchema>
