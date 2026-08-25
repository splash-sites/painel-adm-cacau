/**
 * URL do cardápio já com a mesa preenchida — contrato com o storefront pro passo "QR Code por
 * mesa". Path (`/mesa/1`), não query param — combinado com quem implementou a leitura no storefront.
 */
export function buildTableMenuUrl(storefrontUrl: string, storeSlug: string, tableNumber: string): string {
  const base = storefrontUrl.replace(/\/$/, '')
  return `${base}/${storeSlug}/mesa/${encodeURIComponent(tableNumber)}`
}

/** Gera "1".."20" a partir de um intervalo (ambos inclusive) — mesa é texto livre no schema, mas o gerador em lote assume numeração sequencial. */
export function tableNumberRange(from: number, to: number): string[] {
  if (!Number.isInteger(from) || !Number.isInteger(to) || from < 1 || to < from) return []
  const numbers: string[] = []
  for (let n = from; n <= to; n++) numbers.push(String(n))
  return numbers
}
