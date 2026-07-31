import { z } from 'zod'

export const addonGroupSchema = z.object({
  name: z.string().min(1, 'Nome obrigatório'),
  active: z.boolean(),
})

export type AddonGroupFormInput = z.infer<typeof addonGroupSchema>

export const addonOptionSchema = z.object({
  name: z.string().min(1, 'Nome obrigatório'),
  price: z.coerce.number().min(0, 'Preço não pode ser negativo'),
  loverPrice: z.preprocess(
    (value) => (value === '' || value === undefined ? null : value),
    z.coerce.number().min(0, 'Preço lover não pode ser negativo').nullable(),
  ),
  active: z.boolean(),
})

export type AddonOptionFormInput = z.infer<typeof addonOptionSchema>
