import { useEffect, useMemo, useState, type ChangeEvent } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useEffectiveStoreId } from '../../storeContext/useEffectiveStoreId'
import { buildImportPreview } from '../../../domain/product/import/buildImportPreview'
import { parseProductImportRow } from '../../../domain/product/import/parseProductImportRow'
import { XlsxSpreadsheetParser } from '../../../infrastructure/product/import/XlsxSpreadsheetParser'
import { buttonClass, cardClass, tableCardClass, tableHeaderCellClass, tableRowClass } from '../../ui/styles'
import { useImportMergeSnapshot, useImportProducts } from './useProductImport'
import { useCategoryList } from '../../category/useCategories'
import type { ProductImportValues } from '../../../domain/product/import/ProductImportRow'

const parser = new XlsxSpreadsheetParser()

const actionLabel = { create: 'Criar', update: 'Atualizar' } as const

function channelLabel(values: ProductImportValues): string {
  return (
    [
      values.availableDineIn && 'Cafeteria',
      values.availablePickup && 'Para levar/entrega',
      values.availableReseller && 'Revendedor',
    ]
      .filter(Boolean)
      .join(', ') || '—'
  )
}

export function ProductImportPage() {
  const storeId = useEffectiveStoreId()
  const navigate = useNavigate()
  const location = useLocation()

  const [rawRows, setRawRows] = useState<Record<string, unknown>[] | null>(null)
  const [fileName, setFileName] = useState<string | null>(null)
  const [parseError, setParseError] = useState<string | null>(null)
  const [importResult, setImportResult] = useState<{ created: number; updated: number } | null>(null)

  const codes = useMemo(() => {
    if (!rawRows) return []
    const parsed = rawRows.map(parseProductImportRow)
    return [...new Set(parsed.filter((row) => row !== null).map((row) => row.externalCode))]
  }, [rawRows])

  const { data: mergeSnapshot } = useImportMergeSnapshot(storeId, codes)
  const { data: categories } = useCategoryList(storeId)
  const importProducts = useImportProducts()

  const preview = useMemo(() => {
    if (!rawRows || !categories) return null
    // Espera o snapshot só quando há código pra buscar (query fica desabilitada com lista vazia).
    if (codes.length > 0 && !mergeSnapshot) return null
    const existingCategoryNames = new Set(categories.map((category) => category.name))
    return buildImportPreview(rawRows, mergeSnapshot ?? new Map(), existingCategoryNames)
  }, [rawRows, categories, codes, mergeSnapshot])

  async function parseFile(file: File) {
    setParseError(null)
    setImportResult(null)
    setFileName(file.name)
    try {
      const rows = await parser.parseFile(file)
      setRawRows(rows)
    } catch (error) {
      setRawRows(null)
      setParseError(error instanceof Error ? error.message : 'Falha ao ler o arquivo')
    }
  }

  // roda de novo só se a navegação trouxer um state novo (location.state é estável entre re-renders)
  useEffect(() => {
    const incomingFile = (location.state as { file?: File } | null)?.file
    if (incomingFile) parseFile(incomingFile)
  }, [location.state])

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return
    await parseFile(file)
  }

  async function handleConfirm() {
    if (!preview || !storeId) return
    try {
      const result = await importProducts.mutateAsync({ storeId, rows: preview.rows })
      setImportResult(result)
      setRawRows(null)
    } catch (error) {
      setParseError(error instanceof Error ? error.message : 'Falha ao importar produtos')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-2xl md:text-3xl text-accent">Importar planilha de estoque</h2>
        <button type="button" onClick={() => navigate('/produtos')} className={buttonClass('outline')}>
          Voltar pra produtos
        </button>
      </div>

      {!storeId && (
        <div className={cardClass}>
          <p className="font-body">Selecione uma loja pra importar.</p>
        </div>
      )}

      {storeId && (
        <div className={`flex items-center justify-between gap-3 ${cardClass}`}>
          <p className="font-body text-sm text-foreground/70">
            {fileName ? (
              <>
                Arquivo: <span className="font-medium text-foreground">{fileName}</span>
              </>
            ) : (
              'Nenhum arquivo selecionado.'
            )}
          </p>
          <label className={`${buttonClass('outline')} cursor-pointer`}>
            Trocar arquivo
            <input
              type="file"
              accept=".xlsx,.csv"
              onChange={handleFileChange}
              className="hidden"
            />
          </label>
        </div>
      )}

      {parseError && <p className="font-body text-red-600">{parseError}</p>}

      {importResult && (
        <p className="font-body text-green-700">
          Importado: {importResult.created} produto(s) criado(s), {importResult.updated} atualizado(s).
        </p>
      )}

      {preview && (
        <div className="space-y-3">
          <p className="font-body text-xs text-foreground/50 md:hidden">
            Arraste a tabela para o lado para ver todas as colunas.
          </p>
          {/* `tableCardClass` traz `overflow-hidden` (pros cantos arredondados), então o scroll
              horizontal vai num wrapper interno próprio — os dois `overflow` brigam se ficam no
              mesmo elemento. `min-w-max` faz a tabela crescer até a largura do conteúdo e
              `[&_th]/[&_td]:px-4` dá respiro entre as colunas. */}
          <div className={tableCardClass}>
            <div className="overflow-x-auto">
              <table className="w-full min-w-max whitespace-nowrap text-left font-body [&_td]:px-4 [&_th]:px-4">
                <thead>
                  <tr>
                    <th className={`${tableHeaderCellClass} !pl-6`}>Ação</th>
                    <th className={tableHeaderCellClass}>Código</th>
                    <th className={tableHeaderCellClass}>Descrição</th>
                    <th className={tableHeaderCellClass}>Categoria</th>
                    <th className={tableHeaderCellClass}>Cardápio</th>
                    <th className={tableHeaderCellClass}>Ativo</th>
                    <th className={tableHeaderCellClass}>Estoque</th>
                    <th className={tableHeaderCellClass}>Custo</th>
                    <th className={tableHeaderCellClass}>Preço</th>
                    <th className={tableHeaderCellClass}>Lover</th>
                    <th className={`${tableHeaderCellClass} !pr-6`}>Ordem</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.rows.map((row) => (
                    <tr key={row.externalCode} className={tableRowClass}>
                      <td className="py-3 !pl-6">
                        <span
                          className={`rounded-full text-xs px-2.5 py-1 ${
                            row.action === 'create'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {actionLabel[row.action]}
                        </span>
                      </td>
                      <td className="py-3">{row.externalCode}</td>
                      <td className="py-3">{row.name}</td>
                      <td className="py-3">{row.resolved.categoryName ?? '—'}</td>
                      <td className="py-3">{channelLabel(row.resolved)}</td>
                      <td className="py-3">{row.resolved.active ? 'Ativo' : 'Inativo'}</td>
                      <td className="py-3">
                        {row.resolved.trackStock ? row.resolved.stockQuantity : 'não controla'}
                      </td>
                      <td className="py-3">{row.resolved.costPrice ?? '—'}</td>
                      <td className="py-3">{row.resolved.price}</td>
                      <td className="py-3">{row.resolved.loverPrice}</td>
                      <td className="py-3 !pr-6">{row.resolved.sortOrder}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {preview && (
        <div className="sticky bottom-0 z-10 -mx-6 -mb-6 flex flex-wrap items-center justify-between gap-3 border-t border-secondary/20 bg-background px-6 py-4 shadow-[0_-4px_12px_-4px_rgba(0,0,0,0.12)]">
          <p className="font-body text-sm text-foreground/70">
            {preview.rows.filter((row) => row.action === 'create').length} para criar,{' '}
            {preview.rows.filter((row) => row.action === 'update').length} para atualizar
            {preview.skippedCount > 0 && `, ${preview.skippedCount} linha(s) ignorada(s) (sem código/descrição)`}
            {preview.duplicateCount > 0 && `, ${preview.duplicateCount} código(s) duplicado(s) no arquivo (última linha vence)`}
            .
            {preview.newCategoryNames.length > 0 && (
              <>
                <br />
                Categoria(s) que serão criadas: {preview.newCategoryNames.join(', ')}.
              </>
            )}
            <br />
            Célula vazia mantém o valor atual do produto (ao atualizar) ou usa o padrão (ao criar) —
            a tabela acima já mostra o valor final.
          </p>

          <button
            type="button"
            onClick={handleConfirm}
            disabled={importProducts.isPending || preview.rows.length === 0}
            className={buttonClass('primary')}
          >
            {importProducts.isPending ? 'Gravando...' : 'Confirmar importação'}
          </button>
        </div>
      )}
    </div>
  )
}
