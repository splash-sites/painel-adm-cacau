import type { Store } from '../../domain/store/Store'

export interface StoreInput {
  name: string
  slug: string
  active: boolean
  supportsDineIn: boolean
  supportsPickup: boolean
  supportsDelivery: boolean
  resellerEnabled: boolean
  whatsappNumber: string | null
}

export interface StoreListParams {
  page: number
  pageSize: number
}

export interface StoreListResult {
  items: Store[]
  total: number
}

export interface StoreRepository {
  list(params: StoreListParams): Promise<StoreListResult>
  getById(id: string): Promise<Store | null>
  create(input: StoreInput): Promise<Store>
  update(id: string, input: StoreInput): Promise<Store>
  delete(id: string): Promise<void>
}
