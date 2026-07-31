import { z } from 'zod'

export const updateAdminProfileSchema = z.object({
  fullName: z.string().min(1, 'Nome obrigatório'),
  email: z.string().email('E-mail inválido'),
  password: z
    .string()
    .refine((value) => value === '' || value.length >= 6, 'Senha precisa de pelo menos 6 caracteres'),
})

export type UpdateAdminProfileInput = z.infer<typeof updateAdminProfileSchema>
