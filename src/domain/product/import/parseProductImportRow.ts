import type { ProductImportRow } from './ProductImportRow'

const DIACRITICS_PATTERN = /[̀-ͯ]/g

function normalizeHeader(header: string): string {
  return header.normalize('NFD').replace(DIACRITICS_PATTERN, '').trim().toLowerCase()
}

function findValue(record: Record<string, unknown>, aliases: string[]): unknown {
  const normalized = Object.entries(record).map(([key, value]) => [normalizeHeader(key), value] as const)
  for (const alias of aliases) {
    const found = normalized.find(([key]) => key === alias)
    if (found) return found[1]
  }
  return undefined
}

function parseNumber(raw: unknown): number | null {
  if (raw === null || raw === undefined || raw === '') return null
  if (typeof raw === 'number') return raw
  const cleaned = String(raw)
    .replace(/r\$/gi, '')
    .trim()
    .replace(/\./g, '')
    .replace(',', '.')
  const value = Number(cleaned)
  return Number.isFinite(value) ? value : null
}

function parseText(raw: unknown): string | null {
  const text = raw === null || raw === undefined ? '' : String(raw).trim()
  return text || null
}

/** Coluna sim/não. `null` quando a célula está vazia ou tem valor não reconhecido — "não informado". */
function parseYesNo(raw: unknown): boolean | null {
  const text = normalizeHeader(String(raw ?? ''))
  if (['sim', 's', 'true', '1', 'x', 'yes', 'ativo', 'ativa'].includes(text)) return true
  if (['nao', 'n', 'false', '0', 'no', 'inativo', 'inativa'].includes(text)) return false
  return null
}

/**
 * Só extrai os valores da linha, sem aplicar default nenhum — célula vazia vira `null`
 * ("não informado"). A resolução (manter valor atual vs. usar default) é do resolveImportValues.
 * Colunas Local/Custo Total/Preço Total/Situação são ignoradas por não terem alias mapeado aqui.
 */
export function parseProductImportRow(record: Record<string, unknown>): ProductImportRow | null {
  const externalCode = parseText(findValue(record, ['codigo']))
  const name = parseText(findValue(record, ['descricao']))
  if (!externalCode || !name) return null

  const trackStock = parseYesNo(findValue(record, ['utilizara estoque', 'usar estoque', 'controla estoque', 'controlar estoque']))
  const rawStock = parseNumber(findValue(record, ['estoque']))

  return {
    externalCode,
    name,
    description: parseText(findValue(record, ['descricao detalhada', 'descricao completa', 'detalhes'])),
    categoryName: parseText(findValue(record, ['categoria'])),
    ncm: parseText(findValue(record, ['ncm'])),
    unit: parseText(findValue(record, ['unidade'])),
    trackStock,
    // "Utilizará estoque = não" força quantidade 0 mesmo se a célula Estoque tiver valor (igual ProductModal).
    stockQuantity: trackStock === false ? 0 : rawStock,
    costPrice: parseNumber(findValue(record, ['custo r$', 'custo'])),
    price: parseNumber(findValue(record, ['preco r$', 'preco'])),
    loverPrice: parseNumber(findValue(record, ['lover r$', 'preco lover r$', 'preco lover', 'lover'])),
    active: parseYesNo(findValue(record, ['ativo', 'ativa', 'produto ativo'])),
    availableDineIn: parseYesNo(findValue(record, ['cafeteria', 'consumo no local', 'salao'])),
    availablePickup: parseYesNo(findValue(record, ['para levar/entrega', 'para levar', 'retirada', 'entrega'])),
    availableReseller: parseYesNo(findValue(record, ['revendedor', 'revenda', 'atacado'])),
  }
}
