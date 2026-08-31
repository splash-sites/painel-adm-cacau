import type { Product } from '../../domain/product/Product'
import type { ImportPreviewRow } from '../../domain/product/import/buildImportPreview'
import type { ProductImportValues } from '../../domain/product/import/ProductImportRow'

export interface ProductInput {
  externalCode: string
  name: string
  ncm: string | null
  unit: string | null
  /** @deprecated texto livre, mantido só por compatibilidade — gravado junto com categoryId (nome espelhado), nunca só ele. */
  category: string | null
  categoryId: string | null
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

export type ProductMenuType = 'dine_in' | 'pickup' | 'reseller'

export interface ProductListParams {
  storeId: string
  page: number
  pageSize: number
  /** Só produtos sem categoria e/ou sem foto — pra facilitar completar cadastro pós-importação. */
  incompleteOnly?: boolean
  /** Casa (ilike) contra external_code OU name. */
  search?: string
  /** Filtra por categoria vinculada. */
  categoryId?: string
  /** Filtra por canal do produto (available_dine_in/pickup/reseller = true). */
  menuType?: ProductMenuType
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
  /** Todos os produtos da loja, sem paginação — pra exportação de planilha e organização do cardápio. */
  listAll(storeId: string): Promise<Product[]>
  /**
   * Grava a nova ordem (`sort_order` = posição na lista) dos produtos de UMA categoria.
   * `categoryId = null` reordena os produtos sem categoria. Renumeração é por categoria (0..n).
   */
  reorderInCategory(storeId: string, categoryId: string | null, orderedIds: string[]): Promise<void>
  getById(id: string): Promise<Product | null>
  create(storeId: string, input: ProductInput): Promise<Product>
  update(id: string, input: ProductInput): Promise<Product>
  delete(id: string): Promise<void>
  /**
   * Estado atual dos produtos que a importação vai tocar, indexado por `external_code`.
   * Usado pra decidir create vs update e pra manter as colunas cujas células vieram vazias.
   */
  listForImportMerge(
    storeId: string,
    externalCodes: string[],
  ): Promise<Map<string, ProductImportValues>>
  /** Busca por nome, produto ativo, escopada no servidor (nunca "traz tudo e filtra no client"). */
  searchActive(storeId: string, query: string): Promise<Product[]>
  bulkUpsertFromImport(
    storeId: string,
    rows: ImportPreviewRow[],
    categoryIdByName: Map<string, string>,
  ): Promise<ProductImportSummary>
}
