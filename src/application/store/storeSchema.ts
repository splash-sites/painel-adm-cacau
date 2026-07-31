import { z } from 'zod'

export const storeSchema = z.object({
  name: z.string().min(1, 'Nome obrigatório'),
  slug: z
    .string()
    .min(1, 'Slug obrigatório')
    .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'Use minúsculas, números e hífen'),
  active: z.boolean(),
  supportsDineIn: z.boolean(),
  supportsPickup: z.boolean(),
  supportsDelivery: z.boolean(),
  resellerEnabled: z.boolean(),
  whatsappNumber: z.string().optional(),
})

export type StoreFormInput = z.infer<typeof storeSchema>

/** Só na criação de loja nova o WhatsApp é obrigatório — loja já existente sem número continua editável normalmente. */
export const createStoreSchema = storeSchema.extend({
  whatsappNumber: z
    .string()
    .min(1, 'WhatsApp obrigatório')
    .refine((value) => value.replace(/\D/g, '').length >= 10, 'Número inválido — inclua DDI e DDD, só números'),
})

export type CreateStoreFormInput = z.infer<typeof createStoreSchema>
