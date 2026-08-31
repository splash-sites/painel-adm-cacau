export type VariationPriceMode = 'additive' | 'replace'

export interface VariationGroup {
  id: string
  storeId: string
  name: string
  active: boolean
  /** 'additive' soma a opção escolhida em cima do preço base (0 = neutro, ex: intensidade). 'replace' faz a opção virar o preço final (ex: tamanho). Config do grupo, não do produto. */
  priceMode: VariationPriceMode
  /** Ordem de exibição global do grupo, nas telas de gerenciar variação (/produtos/variacoes). */
  sortOrder: number
}

export interface VariationOption {
  id: string
  groupId: string
  name: string
  price: number
  /** Preço pra cliente do clube lover — opcional, null = mesmo preço de `price`. */
  loverPrice: number | null
  active: boolean
  /** Ordem de exibição da opção dentro do grupo — é isso que o cliente vê no seletor do cardápio. */
  sortOrder: number
}

/** Vínculo produto↔grupo — sempre single-select e sempre obrigatório, sem config extra (diferente do adicional). */
export interface ProductVariationGroup {
  productId: string
  variationGroupId: string
  /** Ordem de exibição das seções no produto — por produto, não do grupo (2 produtos podem ordenar os mesmos grupos diferente). */
  sortOrder: number
}
