import type { PromotionDiscountType } from './Promotion'

export interface PromotionPriceable {
  discountType: PromotionDiscountType | null
  discountValue: number | null
}

/** Soma do produto principal + cada item extra do combo (preço ao vivo × quantidade) — base sobre a qual o desconto se aplica. */
export function calculatePromotionBaseTotal(
  mainProductPrice: number,
  comboItems: { price: number; quantity: number }[],
): number {
  return comboItems.reduce((sum, item) => sum + item.price * item.quantity, mainProductPrice)
}

/** Aplica o desconto (percentual ou valor fixo) sobre o total base — nunca fica negativo. Sem desconto, devolve o total base. */
export function calculatePromotionDiscountedTotal(baseTotal: number, promotion: PromotionPriceable): number {
  if (!promotion.discountType || promotion.discountValue == null) return baseTotal
  if (promotion.discountType === 'percent') {
    return Math.max(0, baseTotal * (1 - promotion.discountValue / 100))
  }
  return Math.max(0, baseTotal - promotion.discountValue)
}

export interface PromotionComboLine {
  productId: string
  price: number
  quantity: number
}

export interface DistributedComboLine {
  productId: string
  quantity: number
  unitPrice: number
}

/**
 * Distribui o total com desconto entre as linhas do combo (produto principal + itens extras),
 * proporcional ao preço original de cada linha, ajustando centavo a centavo (método do maior
 * resto) pra soma das linhas bater EXATAMENTE com o total descontado. unitPrice pode sair com
 * mais de 2 casas decimais de propósito — a soma fica exata, quem exibe formata pra 2 casas na
 * hora de mostrar (mesmo approach de todo preço no sistema, nunca trunca no banco).
 *
 * Serve tanto pro preço normal quanto pro lover — chama 2x com o array de preços correspondente
 * (mesma função, preço lover não tem regra própria, ver "Feature: Combo e desconto em Promoções").
 */
export function distributePromotionDiscount(
  mainProduct: { productId: string; price: number },
  comboItems: PromotionComboLine[],
  promotion: PromotionPriceable,
): DistributedComboLine[] {
  const lines = [{ productId: mainProduct.productId, price: mainProduct.price, quantity: 1 }, ...comboItems]

  const baseTotal = lines.reduce((sum, line) => sum + line.price * line.quantity, 0)
  const discountedTotal = calculatePromotionDiscountedTotal(baseTotal, promotion)

  if (baseTotal === 0) {
    return lines.map((line) => ({ productId: line.productId, quantity: line.quantity, unitPrice: 0 }))
  }

  const ratio = discountedTotal / baseTotal
  const targetCents = Math.round(discountedTotal * 100)

  const idealCents = lines.map((line) => line.price * line.quantity * ratio * 100)
  const flooredCents = idealCents.map((cents) => Math.floor(cents))
  let remainingCents = targetCents - flooredCents.reduce((sum, cents) => sum + cents, 0)

  const byRemainderDesc = idealCents
    .map((cents, index) => ({ index, remainder: cents - flooredCents[index] }))
    .sort((a, b) => b.remainder - a.remainder)

  const finalCents = [...flooredCents]
  for (let i = 0; i < byRemainderDesc.length && remainingCents > 0; i++) {
    finalCents[byRemainderDesc[i].index] += 1
    remainingCents--
  }

  return lines.map((line, index) => ({
    productId: line.productId,
    quantity: line.quantity,
    unitPrice: finalCents[index] / 100 / line.quantity,
  }))
}
