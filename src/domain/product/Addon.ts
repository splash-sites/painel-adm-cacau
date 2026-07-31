export interface AddonGroup {
  id: string
  storeId: string
  name: string
  active: boolean
}

export interface AddonOption {
  id: string
  groupId: string
  name: string
  price: number
  /** Preço pra cliente do clube lover — opcional, null = mesmo preço de `price`. */
  loverPrice: number | null
  active: boolean
}

export type AddonSelectionType = 'single' | 'multiple'

/** Vínculo produto↔grupo — é aqui que single/multiple e o limite variam por produto, nunca no grupo em si. */
export interface ProductAddonGroup {
  productId: string
  addonGroupId: string
  selectionType: AddonSelectionType
  maxQuantity: number | null
  /** Ordem de exibição das seções no produto — por produto, não do grupo. */
  sortOrder: number
}
