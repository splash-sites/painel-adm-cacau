const MAX_DIGITS = 13 // 55 + DDD (2) + celular (9)

/**
 * Máscara do WhatsApp da loja enquanto digita: "+55 (51) 9 9999-0001", mesmo
 * agrupamento do telefone no cardápio (o 9 do celular separado).
 * O banco guarda só os dígitos (com DDI); a máscara é só da tela.
 * Fixo (número local não começa com 9) fica "+55 (51) 3333-4444".
 */
export function maskWhatsapp(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, MAX_DIGITS)
  if (!digits) return ''

  const country = digits.slice(0, 2)
  const area = digits.slice(2, 4)
  const local = digits.slice(4)
  const isMobile = local.startsWith('9')

  let masked = `+${country}`
  if (digits.length > 2) masked += ` (${area}`
  if (digits.length <= 4) return masked
  masked += ') '

  if (isMobile) {
    const number = local.slice(0, 9)
    masked += number.slice(0, 1)
    if (number.length > 1) masked += ` ${number.slice(1, 5)}`
    if (number.length > 5) masked += `-${number.slice(5)}`
    return masked
  }

  const number = local.slice(0, 8)
  masked += number.slice(0, 4)
  if (number.length > 4) masked += `-${number.slice(4)}`
  return masked
}
