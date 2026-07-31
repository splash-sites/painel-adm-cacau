import { z } from 'zod'

export const variationGroupSchema = z.object({
  name: z.string().min(1, 'Nome obrigatório'),
  active: z.boolean(),
  priceMode: z.enum(['additive', 'replace']),
})

export type VariationGroupFormInput = z.infer<typeof variationGroupSchema>

export const variationOptionSchema = z.object({
  name: z.string().min(1, 'Nome obrigatório'),
  price: z.coerce.number().min(0, 'Preço não pode ser negativo'),
  loverPrice: z.preprocess(
    (value) => (value === '' || value === undefined ? null : value),
    z.coerce.number().min(0, 'Preço lover não pode ser negativo').nullable(),
  ),
  active: z.boolean(),
})

export type VariationOptionFormInput = z.infer<typeof variationOptionSchema>
