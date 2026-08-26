import { supabase } from '../supabase/client'
import type {
  ProductImportSummary,
  ProductInput,
  ProductListParams,
  ProductListResult,
  ProductRepository,
} from '../../application/product/ProductRepository'
import { ProductInUseError } from '../../application/product/ProductInUseError'
import type { Product } from '../../domain/product/Product'
import type { ImportPreviewRow } from '../../domain/product/import/buildImportPreview'

interface ProductRow {
  id: string
  store_id: string
  external_code: string
  name: string
  ncm: string | null
  unit: string | null
  category: string | null
  category_id: string | null
  categories: { name: string } | null
  description: string | null
  image_url: string | null
  track_stock: boolean
  stock_quantity: number
  cost_price: number | null
  price: number
  lover_price: number
  sort_order: number
  active: boolean
  available_dine_in: boolean
  available_pickup: boolean
  available_delivery: boolean
  available_reseller: boolean
}

function toProduct(row: ProductRow): Product {
  return {
    id: row.id,
    storeId: row.store_id,
    externalCode: row.external_code,
    name: row.name,
    ncm: row.ncm,
    unit: row.unit,
    category: row.category,
    categoryId: row.category_id,
    categoryName: row.categories?.name ?? null,
    description: row.description,
    imageUrl: row.image_url,
    trackStock: row.track_stock,
    stockQuantity: row.stock_quantity,
    costPrice: row.cost_price,
    price: row.price,
    loverPrice: row.lover_price,
    sortOrder: row.sort_order,
    active: row.active,
    availableDineIn: row.available_dine_in,
    availablePickup: row.available_pickup,
    availableDelivery: row.available_delivery,
    availableReseller: row.available_reseller,
  }
}

function toRow(input: ProductInput) {
  return {
    external_code: input.externalCode,
    name: input.name,
    ncm: input.ncm,
    unit: input.unit,
    category: input.category,
    category_id: input.categoryId,
    description: input.description,
    image_url: input.imageUrl,
    track_stock: input.trackStock,
    stock_quantity: input.stockQuantity,
    cost_price: input.costPrice,
    price: input.price,
    lover_price: input.loverPrice,
    sort_order: input.sortOrder,
    active: input.active,
    available_dine_in: input.availableDineIn,
    available_pickup: input.availablePickup,
    available_delivery: input.availableDelivery,
    available_reseller: input.availableReseller,
  }
}

const PRODUCT_SELECT = '*, categories(name)'

export class SupabaseProductRepository implements ProductRepository {
  async list({ storeId, page, pageSize, incompleteOnly }: ProductListParams): Promise<ProductListResult> {
    const from = page * pageSize
    const to = from + pageSize - 1

    let query = supabase
      .from('products')
      .select(PRODUCT_SELECT, { count: 'exact' })
      .eq('store_id', storeId)

    if (incompleteOnly) {
      query = query.or('category_id.is.null,image_url.is.null')
    }

    const { data, error, count } = await query.order('sort_order').range(from, to)

    if (error) throw new Error(error.message)

    return { items: (data as ProductRow[]).map(toProduct), total: count ?? 0 }
  }

  async getById(id: string): Promise<Product | null> {
    const { data, error } = await supabase.from('products').select(PRODUCT_SELECT).eq('id', id).single()
    if (error || !data) return null
    return toProduct(data as ProductRow)
  }

  async create(storeId: string, input: ProductInput): Promise<Product> {
    const { data, error } = await supabase
      .from('products')
      .insert({ ...toRow(input), store_id: storeId })
      .select(PRODUCT_SELECT)
      .single()
    if (error || !data) throw new Error(error?.message ?? 'Falha ao criar produto')
    return toProduct(data as ProductRow)
  }

  async update(id: string, input: ProductInput): Promise<Product> {
    const { data, error } = await supabase
      .from('products')
      .update(toRow(input))
      .eq('id', id)
      .select(PRODUCT_SELECT)
      .single()
    if (error || !data) throw new Error(error?.message ?? 'Falha ao atualizar produto')
    return toProduct(data as ProductRow)
  }

  async delete(id: string): Promise<void> {
    const { error } = await supabase.from('products').delete().eq('id', id)
    if (error) {
      if (error.code === '23503') throw new ProductInUseError()
      throw new Error(error.message)
    }
  }

  async searchActive(storeId: string, query: string): Promise<Product[]> {
    let request = supabase.from('products').select(PRODUCT_SELECT).eq('store_id', storeId).eq('active', true)

    const trimmed = query.trim()
    if (trimmed) request = request.ilike('name', `%${trimmed}%`)

    const { data, error } = await request.order('name').limit(20)
    if (error) throw new Error(error.message)
    return (data as ProductRow[]).map(toProduct)
  }

  async listExternalCodes(storeId: string): Promise<Set<string>> {
    const { data, error } = await supabase
      .from('products')
      .select('external_code')
      .eq('store_id', storeId)
    if (error) throw new Error(error.message)
    return new Set((data ?? []).map((row) => row.external_code as string))
  }

  async bulkUpsertFromImport(
    storeId: string,
    rows: ImportPreviewRow[],
  ): Promise<ProductImportSummary> {
    const created = rows.filter((row) => row.action === 'create').length
    const updated = rows.length - created

    const payload = rows.map((row) => ({
      store_id: storeId,
      external_code: row.externalCode,
      name: row.name,
      ncm: row.ncm,
      unit: row.unit,
      stock_quantity: row.stockQuantity,
      cost_price: row.costPrice,
      price: row.price,
      sort_order: row.sortOrder,
    }))

    const { error } = await supabase
      .from('products')
      .upsert(payload, { onConflict: 'store_id,external_code' })

    if (error) throw new Error(error.message)

    return { created, updated }
  }
}
