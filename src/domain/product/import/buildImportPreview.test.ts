import { describe, expect, it } from 'vitest'
import { buildImportPreview } from './buildImportPreview'

describe('buildImportPreview', () => {
  it('marks rows as create or update based on existingCodes', () => {
    const preview = buildImportPreview(
      [
        { Codigo: 'NEW1', Descricao: 'Produto novo' },
        { Codigo: 'OLD1', Descricao: 'Produto existente' },
      ],
      new Set(['OLD1']),
    )

    expect(preview.rows).toEqual([
      expect.objectContaining({ externalCode: 'NEW1', action: 'create' }),
      expect.objectContaining({ externalCode: 'OLD1', action: 'update' }),
    ])
    expect(preview.skippedCount).toBe(0)
    expect(preview.duplicateCount).toBe(0)
  })

  it('counts unparsable rows as skipped', () => {
    const preview = buildImportPreview([{ Descricao: 'Sem codigo' }, {}], new Set())
    expect(preview.rows).toHaveLength(0)
    expect(preview.skippedCount).toBe(2)
  })

  it('deduplicates repeated codes keeping the last occurrence', () => {
    const preview = buildImportPreview(
      [
        { Codigo: 'DUP', Descricao: 'Primeira versão', Estoque: '1' },
        { Codigo: 'DUP', Descricao: 'Segunda versão', Estoque: '2' },
      ],
      new Set(),
    )

    expect(preview.duplicateCount).toBe(1)
    expect(preview.rows).toHaveLength(1)
    expect(preview.rows[0]).toEqual(expect.objectContaining({ name: 'Segunda versão', stockQuantity: 2 }))
  })
})
