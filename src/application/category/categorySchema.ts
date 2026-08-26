import { z } from 'zod'

export const categorySchema = z.object({
  name: z.string().min(1, 'Nome obrigatório'),
  active: z.boolean(),
})

export type CategoryFormInput = z.infer<typeof categorySchema>
