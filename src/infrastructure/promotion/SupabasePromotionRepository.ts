import { supabase } from '../supabase/client'
import type {
  PromotionComboItemInput,
  PromotionInput,
  PromotionRepository,
} from '../../application/promotion/PromotionRepository'
import type { Promotion, PromotionDiscountType } from '../../domain/promotion/Promotion'

interface PromotionComboItemRow {
  id: string
  product_id: string
  quantity: number
  products: { name: string; price: number; lover_price: number } | null
}

interface PromotionRow {
  id: string
  store_id: string
  title: string
  subtitle: string | null
  badge_label: string | null
  image_url: string
  product_id: string
  products: { name: string } | null
  sort_order: number
  active: boolean
  discount_type: PromotionDiscountType | null
  discount_value: number | null
  promotion_combo_items: PromotionComboItemRow[]
}

function toPromotion(row: PromotionRow): Promotion {
  return {
    id: row.id,
    storeId: row.store_id,
    title: row.title,
    subtitle: row.subtitle,
    badgeLabel: row.badge_label,
    imageUrl: row.image_url,
    productId: row.product_id,
    productName: row.products?.name ?? '—',
    sortOrder: row.sort_order,
    active: row.active,
    discountType: row.discount_type,
    discountValue: row.discount_value,
    comboItems: row.promotion_combo_items.map((item) => ({
      id: item.id,
      productId: item.product_id,
      productName: item.products?.name ?? '—',
      price: item.products?.price ?? 0,
      loverPrice: item.products?.lover_price ?? 0,
      quantity: item.quantity,
    })),
  }
}

function toRow(input: PromotionInput) {
  return {
    title: input.title,
    subtitle: input.subtitle,
    badge_label: input.badgeLabel,
    image_url: input.imageUrl,
    product_id: input.productId,
    active: input.active,
    discount_type: input.discountType,
    discount_value: input.discountValue,
  }
}

const PROMOTION_SELECT =
  '*, products(name), promotion_combo_items(id, product_id, quantity, products(name, price, lover_price))'

export class SupabasePromotionRepository implements PromotionRepository {
  async list(storeId: string): Promise<Promotion[]> {
    const { data, error } = await supabase
      .from('promotions')
      .select(PROMOTION_SELECT)
      .eq('store_id', storeId)
      .order('sort_order')

    if (error) throw new Error(error.message)
    return (data as PromotionRow[]).map(toPromotion)
  }

  async create(storeId: string, input: PromotionInput): Promise<Promotion> {
    const { data: lastRow, error: maxError } = await supabase
      .from('promotions')
      .select('sort_order')
      .eq('store_id', storeId)
      .order('sort_order', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (maxError) throw new Error(maxError.message)
    const sortOrder = lastRow ? lastRow.sort_order + 1 : 0

    const { data: inserted, error } = await supabase
      .from('promotions')
      .insert({ ...toRow(input), store_id: storeId, sort_order: sortOrder })
      .select('id')
      .single()

    if (error || !inserted) throw new Error(error?.message ?? 'Falha ao criar promoção')

    await this.replaceComboItems(inserted.id, input.comboItems)

    const { data, error: fetchError } = await supabase
      .from('promotions')
      .select(PROMOTION_SELECT)
      .eq('id', inserted.id)
      .single()

    if (fetchError || !data) throw new Error(fetchError?.message ?? 'Falha ao carregar promoção criada')
    return toPromotion(data as PromotionRow)
  }

  async update(id: string, input: PromotionInput): Promise<void> {
    const { error } = await supabase.from('promotions').update(toRow(input)).eq('id', id)
    if (error) throw new Error(error.message)
    await this.replaceComboItems(id, input.comboItems)
  }

  async delete(id: string): Promise<void> {
    const { error } = await supabase.from('promotions').delete().eq('id', id)
    if (error) throw new Error(error.message)
  }

  async reorder(storeId: string, orderedIds: string[]): Promise<void> {
    // Upsert em 1 lote precisa do row inteiro (title/image_url/product_id são NOT NULL — upsert
    // parcial falha no ON CONFLICT DO UPDATE, mesmo caso já confirmado em product_addon_groups).
    const { data, error: fetchError } = await supabase
      .from('promotions')
      .select(
        'id, store_id, title, subtitle, badge_label, image_url, product_id, active, sort_order, discount_type, discount_value',
      )
      .eq('store_id', storeId)

    if (fetchError) throw new Error(fetchError.message)

    const rowById = new Map(
      (data as Omit<PromotionRow, 'products' | 'promotion_combo_items'>[]).map((row) => [row.id, row]),
    )
    const payload = orderedIds.map((id, index) => {
      const row = rowById.get(id)
      if (!row) throw new Error('Promoção não encontrada nessa loja')
      return { ...row, sort_order: index }
    })

    const { error } = await supabase.from('promotions').upsert(payload)
    if (error) throw new Error(error.message)
  }

  private async replaceComboItems(promotionId: string, items: PromotionComboItemInput[]): Promise<void> {
    const { error: deleteError } = await supabase
      .from('promotion_combo_items')
      .delete()
      .eq('promotion_id', promotionId)
    if (deleteError) throw new Error(deleteError.message)

    if (items.length === 0) return

    const { error: insertError } = await supabase.from('promotion_combo_items').insert(
      items.map((item) => ({
        promotion_id: promotionId,
        product_id: item.productId,
        quantity: item.quantity,
      })),
    )
    if (insertError) throw new Error(insertError.message)
  }
}
