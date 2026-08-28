/**
 * Linha da planilha já parseada, ainda CRUA: cada campo opcional é `null` quando a célula
 * veio vazia/ausente. `null` aqui significa "não informado" — quem resolve decide se isso
 * vira o valor atual do produto (ao atualizar) ou o default (ao criar). Ver resolveImportValues.
 */
export interface ProductImportRow {
  externalCode: string
  name: string
  /** Coluna "Descrição detalhada" → products.description. Não confundir com "Descrição" (→ name). */
  description: string | null
  /** Nome da categoria como veio na planilha. Resolvido pra category_id na hora de gravar. */
  categoryName: string | null
  ncm: string | null
  unit: string | null
  trackStock: boolean | null
  stockQuantity: number | null
  costPrice: number | null
  price: number | null
  loverPrice: number | null
  sortOrder: number | null
  active: boolean | null
  availableDineIn: boolean | null
  availablePickup: boolean | null
  availableReseller: boolean | null
}

/**
 * Valores efetivos de um produto, já resolvidos (sem `null` de "não informado" — só os `null`
 * que são valor real, tipo cost_price sem custo). Serve tanto pro snapshot do produto atual
 * quanto pra saída de resolveImportValues.
 */
export interface ProductImportValues {
  description: string | null
  categoryName: string | null
  ncm: string | null
  unit: string | null
  trackStock: boolean
  stockQuantity: number
  costPrice: number | null
  price: number
  loverPrice: number
  sortOrder: number
  active: boolean
  availableDineIn: boolean
  availablePickup: boolean
  availableReseller: boolean
}
