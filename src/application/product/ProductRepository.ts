import type { Product } from '../../domain/product/Product'
import type { ImportPreviewRow } from '../../domain/product/import/buildImportPreview'

export interface ProductInput {
  externalCode: string
  name: string
  ncm: string | null
  unit: string | null
  category: string | null
  description: string | null
  imageUrl: string | null
  trackStock: boolean
  stockQuantity: number
  costPrice: number | null
  price: number
  loverPrice: number
  sortOrder: number
  active: boolean
  availableDineIn: boolean
  availablePickup: boolean
  availableDelivery: boolean
  availableReseller: boolean
}

export interface ProductListParams {
  storeId: string
  page: number
  pageSize: number
  /** Só produtos sem categoria e/ou sem foto — pra facilitar completar cadastro pós-importação. */
  incompleteOnly?: boolean
}

export interface ProductListResult {
  items: Product[]
  total: number
}

export interface ProductImportSummary {
  created: number
  updated: number
}

export interface ProductRepository {
  list(params: ProductListParams): Promise<ProductListResult>
  getById(id: string): Promise<Product | null>
  create(storeId: string, input: ProductInput): Promise<Product>
  update(id: string, input: ProductInput): Promise<Product>
  delete(id: string): Promise<void>
  listExternalCodes(storeId: string): Promise<Set<string>>
  /** Busca por nome, produto ativo, escopada no servidor (nunca "traz tudo e filtra no client"). */
  searchActive(storeId: string, query: string): Promise<Product[]>
  bulkUpsertFromImport(storeId: string, rows: ImportPreviewRow[]): Promise<ProductImportSummary>
}
