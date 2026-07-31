export interface Store {
  id: string
  name: string
  slug: string
  active: boolean
  supportsDineIn: boolean
  supportsPickup: boolean
  supportsDelivery: boolean
  resellerEnabled: boolean
  /** Só dígitos, com DDI+DDD (ex: 5551999998888) — formato exigido pelo link wa.me. */
  whatsappNumber: string | null
}
