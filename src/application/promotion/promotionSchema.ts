import { z } from 'zod'

export const promotionSchema = z
  .object({
    title: z.string().min(1, 'Título obrigatório'),
    subtitle: z.string().optional(),
    badgeLabel: z.string().optional(),
    imageUrl: z.string().min(1, 'Imagem obrigatória'),
    productId: z.string().min(1, 'Produto obrigatório'),
    active: z.boolean(),
    discountType: z.enum(['percent', 'fixed_amount']).nullable(),
    discountValue: z.preprocess(
      (value) => (value === '' || value === undefined ? null : value),
      z.coerce.number().min(0, 'Valor não pode ser negativo').nullable(),
    ),
  })
  .refine((data) => !data.discountType || data.discountValue != null, {
    message: 'Informe o valor do desconto',
    path: ['discountValue'],
  })
  .refine((data) => data.discountType !== 'percent' || (data.discountValue ?? 0) <= 100, {
    message: 'Percentual não pode passar de 100',
    path: ['discountValue'],
  })

export type PromotionFormInput = z.infer<typeof promotionSchema>
