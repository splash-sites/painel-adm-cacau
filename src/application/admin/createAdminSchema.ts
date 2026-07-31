import { z } from 'zod'

export const createAdminSchema = z
  .object({
    fullName: z.string().min(1, 'Nome obrigatório'),
    email: z.string().email('E-mail inválido'),
    password: z.string().min(6, 'Senha precisa de pelo menos 6 caracteres'),
    role: z.enum(['super_admin', 'store_admin']),
    storeId: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.role === 'store_admin' && !data.storeId) {
      ctx.addIssue({
        code: 'custom',
        path: ['storeId'],
        message: 'Loja obrigatória pra store_admin',
      })
    }
  })

export type CreateAdminInput = z.infer<typeof createAdminSchema>
