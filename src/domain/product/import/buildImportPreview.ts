import { parseProductImportRow } from './parseProductImportRow'
import type { ProductImportRow } from './ProductImportRow'

export type ImportAction = 'create' | 'update'

export interface ImportPreviewRow extends ProductImportRow {
  action: ImportAction
}

export interface ImportPreview {
  rows: ImportPreviewRow[]
  skippedCount: number
  duplicateCount: number
}

/**
 * Linhas sem código/descrição contam em skippedCount. Código repetido dentro do
 * próprio arquivo conta em duplicateCount e mantém só a última ocorrência —
 * evita erro de "ON CONFLICT... affect row a second time" no upsert.
 */
export function buildImportPreview(
  rawRows: Record<string, unknown>[],
  existingCodes: Set<string>,
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

  const rows: ImportPreviewRow[] = Array.from(byCode.values()).map((row) => ({
    ...row,
    action: existingCodes.has(row.externalCode) ? 'update' : 'create',
  }))

  return { rows, skippedCount, duplicateCount }
}
