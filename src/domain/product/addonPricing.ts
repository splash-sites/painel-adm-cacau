import type { ProductAddonGroup } from './Addon'

export interface AddonSelection {
  quantity: number
  price: number
}

/**
 * Preço do item = (preço base + adicionais por unidade) × quantidade do produto.
 * Adicional se aplica a cada unidade do produto na linha — 2x Capuccino + 1x Morango (adicional)
 * vira 2 morangos no total, não 1 (ex: unitPrice=8, quantity=2, addon 9×1 → (8+9)×2 = 34).
 */
export function calculateItemTotal(unitPrice: number, quantity: number, addons: AddonSelection[]): number {
  const addonsPerUnit = addons.reduce((sum, addon) => sum + addon.price * addon.quantity, 0)
  return (unitPrice + addonsPerUnit) * quantity
}

/**
 * Adicional é sempre opcional — nenhuma seleção é sempre válida.
 * Quando o cliente escolhe algo, valida contra a regra do vínculo produto↔grupo (single/multiple, max_quantity).
 */
export function isValidAddonSelection(
  rule: Pick<ProductAddonGroup, 'selectionType' | 'maxQuantity'>,
  selections: Pick<AddonSelection, 'quantity'>[],
): boolean {
  if (selections.length === 0) return true

  if (rule.selectionType === 'single' && selections.length > 1) return false

  const totalQuantity = selections.reduce((sum, selection) => sum + selection.quantity, 0)
  if (rule.maxQuantity != null && totalQuantity > rule.maxQuantity) return false

  return true
}
