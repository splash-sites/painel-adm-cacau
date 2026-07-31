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

/** Colunas Local/Custo Total/Preço Total/Situação são ignoradas por não terem alias mapeado aqui. */
export function parseProductImportRow(record: Record<string, unknown>): ProductImportRow | null {
  const externalCode = parseText(findValue(record, ['codigo']))
  const name = parseText(findValue(record, ['descricao']))
  if (!externalCode || !name) return null

  return {
    externalCode,
    name,
    ncm: parseText(findValue(record, ['ncm'])),
    unit: parseText(findValue(record, ['unidade'])),
    stockQuantity: parseNumber(findValue(record, ['estoque'])) ?? 0,
    costPrice: parseNumber(findValue(record, ['custo r$', 'custo'])),
    price: parseNumber(findValue(record, ['preco r$', 'preco'])) ?? 0,
    sortOrder: parseNumber(findValue(record, ['ordem'])) ?? 0,
  }
}
