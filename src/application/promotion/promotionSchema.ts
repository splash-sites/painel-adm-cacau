import { z } from 'zod'

export const promotionSchema = z.object({
  title: z.string().min(1, 'Título obrigatório'),
  subtitle: z.string().optional(),
  badgeLabel: z.string().optional(),
  imageUrl: z.string().min(1, 'Imagem obrigatória'),
  productId: z.string().min(1, 'Produto obrigatório'),
  active: z.boolean(),
})

export type PromotionFormInput = z.infer<typeof promotionSchema>
