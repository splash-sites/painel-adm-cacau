import type { ProductImportRow, ProductImportValues } from './ProductImportRow'

/**
 * Junta a linha crua da planilha com o estado atual do produto (ou os defaults, quando o
 * produto ainda não existe) e devolve os valores efetivos a gravar.
 *
 * Regra: célula vazia (`null` na linha) **não sobrescreve** — mantém o valor atual do produto
 * ao atualizar (`existing` preenchido), ou cai no default ao criar (`existing = null`).
 * Célula preenchida sempre vence.
 */
export function resolveImportValues(
  row: ProductImportRow,
  existing: ProductImportValues | null,
): ProductImportValues {
  const price = row.price ?? existing?.price ?? 0
  const trackStock = row.trackStock ?? existing?.trackStock ?? true

  return {
    description: row.description ?? existing?.description ?? null,
    categoryName: row.categoryName ?? existing?.categoryName ?? null,
    ncm: row.ncm ?? existing?.ncm ?? null,
    unit: row.unit ?? existing?.unit ?? null,
    trackStock,
    // Sem controle de estoque, quantidade não tem significado — sempre 0.
    stockQuantity: trackStock ? (row.stockQuantity ?? existing?.stockQuantity ?? 0) : 0,
    costPrice: row.costPrice ?? existing?.costPrice ?? null,
    price,
    // Lover não informado: mantém o atual; se não houver atual (produto novo), cai no preço normal.
    loverPrice: row.loverPrice ?? existing?.loverPrice ?? price,
    sortOrder: row.sortOrder ?? existing?.sortOrder ?? 0,
    active: row.active ?? existing?.active ?? true,
    availableDineIn: row.availableDineIn ?? existing?.availableDineIn ?? true,
    availablePickup: row.availablePickup ?? existing?.availablePickup ?? true,
    availableReseller: row.availableReseller ?? existing?.availableReseller ?? false,
  }
}
