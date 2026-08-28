import { parseProductImportRow } from './parseProductImportRow'
import { resolveImportValues } from './resolveImportValues'
import type { ProductImportRow, ProductImportValues } from './ProductImportRow'

export type ImportAction = 'create' | 'update'

export interface ImportPreviewRow {
  externalCode: string
  name: string
  action: ImportAction
  /** Valores efetivos a gravar: célula vazia já foi resolvida pro valor atual (update) ou default (create). */
  resolved: ProductImportValues
}

export interface ImportPreview {
  rows: ImportPreviewRow[]
  skippedCount: number
  duplicateCount: number
  /** Nomes de categoria que ainda não existem na loja — serão criados ao confirmar. */
  newCategoryNames: string[]
}

/**
 * Linhas sem código/descrição contam em skippedCount. Código repetido dentro do
 * próprio arquivo conta em duplicateCount e mantém só a última ocorrência —
 * evita erro de "ON CONFLICT... affect row a second time" no upsert.
 *
 * `existingByCode` traz o estado atual dos produtos que a planilha referencia (por
 * `external_code`) — presença nele = ação "update" e base pra manter células vazias;
 * ausência = "create". `existingCategoryNames` é o conjunto de nomes de categoria já
 * cadastrados na loja (comparação sem caixa).
 */
export function buildImportPreview(
  rawRows: Record<string, unknown>[],
  existingByCode: Map<string, ProductImportValues>,
  existingCategoryNames: Set<string>,
): ImportPreview {
  let skippedCount = 0
  const byCode = new Map<string, ProductImportRow>()
  let duplicateCount = 0

  for (const raw of rawRows) {
    const row = parseProductImportRow(raw)
    if (!row) {
      skippedCount++
      continue
    }
    if (byCode.has(row.externalCode)) duplicateCount++
    byCode.set(row.externalCode, row)
  }

  const rows: ImportPreviewRow[] = Array.from(byCode.values()).map((row) => {
    const existing = existingByCode.get(row.externalCode) ?? null
    return {
      externalCode: row.externalCode,
      name: row.name,
      action: existing ? 'update' : 'create',
      resolved: resolveImportValues(row, existing),
    }
  })

  const existingLower = new Set(Array.from(existingCategoryNames, (name) => name.trim().toLowerCase()))
  const newCategoryNames: string[] = []
  const seen = new Set<string>()
  for (const row of rows) {
    const name = row.resolved.categoryName
    if (!name) continue
    const key = name.toLowerCase()
    if (existingLower.has(key) || seen.has(key)) continue
    seen.add(key)
    newCategoryNames.push(name)
  }

  return { rows, skippedCount, duplicateCount, newCategoryNames }
}
