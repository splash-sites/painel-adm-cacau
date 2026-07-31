import type { ProductVariationGroup, VariationPriceMode } from './Variation'

export interface VariationSelection {
  variationGroupId: string
  price: number
}

export interface PricedVariationSelection {
  price: number
  priceMode: VariationPriceMode
}

/**
 * Resolve o efeito das variações escolhidas sobre o preço base (por unidade do produto).
 * 'replace' substitui o preço base (soma entre si se houver mais de uma — caso raro);
 * 'additive' soma em cima do resultado (0 = neutro, ex: intensidade não muda preço).
 * Ex: Capuccino R$8 + variação "Grande" (replace, R$15) = R$15, não R$23.
 */
export function applyVariationsToUnitPrice(unitPrice: number, variations: PricedVariationSelection[]): number {
  const replaceSelections = variations.filter((variation) => variation.priceMode === 'replace')
  const additiveTotal = variations
    .filter((variation) => variation.priceMode === 'additive')
    .reduce((sum, variation) => sum + variation.price, 0)

  const baseUnitPrice =
    replaceSelections.length > 0
      ? replaceSelections.reduce((sum, variation) => sum + variation.price, 0)
      : unitPrice

  return baseUnitPrice + additiveTotal
}

/**
 * Toda variação é obrigatória e single-select — válido só quando a seleção cobre
 * exatamente os grupos vinculados ao produto, 1 opção por grupo, sem repetir grupo.
 */
export function isValidVariationSelection(
  linkedGroups: Pick<ProductVariationGroup, 'variationGroupId'>[],
  selections: Pick<VariationSelection, 'variationGroupId'>[],
): boolean {
  const requiredGroupIds = new Set(linkedGroups.map((link) => link.variationGroupId))
  const selectedGroupIds = selections.map((selection) => selection.variationGroupId)

  if (selectedGroupIds.length !== new Set(selectedGroupIds).size) return false
  if (selectedGroupIds.length !== requiredGroupIds.size) return false

  return selectedGroupIds.every((groupId) => requiredGroupIds.has(groupId))
}
