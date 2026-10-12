const MAX_DIGITS = 13 // 55 + DDD (2) + celular (9)

/**
 * Máscara do WhatsApp da loja enquanto digita: "+55 (51) 99999-0001".
 * O banco guarda só os dígitos (com DDI); a máscara é só da tela.
 * Fixo com 8 dígitos depois do DDD fica "+55 (51) 3333-4444".
 */
export function maskWhatsapp(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, MAX_DIGITS)
  if (!digits) return ''

  const country = digits.slice(0, 2)
  const area = digits.slice(2, 4)
  const local = digits.slice(4)
  const split = local.length > 8 ? 5 : 4

  let masked = `+${country}`
  if (digits.length > 2) masked += ` (${area}`
  if (digits.length > 4) masked += `) ${local.slice(0, split)}`
  if (local.length > split) masked += `-${local.slice(split)}`
  return masked
}
