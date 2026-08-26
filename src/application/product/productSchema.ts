import { z } from 'zod'

export const productSchema = z.object({
  externalCode: z.string().min(1, 'Código obrigatório'),
  name: z.string().min(1, 'Descrição obrigatória'),
  ncm: z.string().optional(),
  unit: z.string().optional(),
  categoryId: z.string().nullable(),
  description: z.string().optional(),
  imageUrl: z.string().optional(),
  trackStock: z.boolean(),
  stockQuantity: z.coerce.number().min(0, 'Estoque não pode ser negativo'),
  costPrice: z.coerce.number().min(0).optional(),
  price: z.coerce.number().min(0, 'Valor não lover não pode ser negativo'),
  loverPrice: z.coerce.number().min(0, 'Valor lover não pode ser negativo'),
  sortOrder: z.coerce.number().int().default(0),
  active: z.boolean(),
  availableDineIn: z.boolean(),
  availablePickup: z.boolean(),
  availableDelivery: z.boolean(),
  availableReseller: z.boolean(),
})

export type ProductFormInput = z.infer<typeof productSchema>
