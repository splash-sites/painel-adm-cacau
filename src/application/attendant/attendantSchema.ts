import { z } from 'zod'

export const attendantSchema = z.object({
  name: z.string().min(1, 'Nome obrigatório'),
  active: z.boolean(),
})

export type AttendantFormInput = z.infer<typeof attendantSchema>
