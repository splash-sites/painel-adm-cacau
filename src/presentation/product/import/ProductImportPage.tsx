import { useEffect, useMemo, useState, type ChangeEvent } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useEffectiveStoreId } from '../../storeContext/useEffectiveStoreId'
import { buildImportPreview } from '../../../domain/product/import/buildImportPreview'
import { XlsxSpreadsheetParser } from '../../../infrastructure/product/import/XlsxSpreadsheetParser'
import { buttonClass, cardClass, tableCardClass, tableHeaderCellClass, tableRowClass } from '../../ui/styles'
import { useExistingExternalCodes, useImportProducts } from './useProductImport'

const parser = new XlsxSpreadsheetParser()

const actionLabel = { create: 'Criar', update: 'Atualizar' } as const

export function ProductImportPage() {
  const storeId = useEffectiveStoreId()
  const navigate = useNavigate()
  const location = useLocation()

  const [rawRows, setRawRows] = useState<Record<string, unknown>[] | null>(null)
  const [fileName, setFileName] = useState<string | null>(null)
  const [parseError, setParseError] = useState<string | null>(null)
  const [importResult, setImportResult] = useState<{ created: number; updated: number } | null>(null)

  const { data: existingCodes } = useExistingExternalCodes(storeId)
  const importProducts = useImportProducts()

  const preview = useMemo(() => {
    if (!rawRows || !existingCodes) return null
    return buildImportPreview(rawRows, existingCodes)
  }, [rawRows, existingCodes])

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
          <div className={`${tableCardClass} overflow-x-auto`}>
            <table className="w-full text-left font-body">
              <thead>
                <tr>
                  <th className={`${tableHeaderCellClass} pl-6`}>Ação</th>
                  <th className={tableHeaderCellClass}>Código</th>
                  <th className={tableHeaderCellClass}>Descrição</th>
                  <th className={tableHeaderCellClass}>Estoque</th>
                  <th className={tableHeaderCellClass}>Custo</th>
                  <th className={tableHeaderCellClass}>Preço</th>
                  <th className={`${tableHeaderCellClass} pr-6`}>Ordem</th>
                </tr>
              </thead>
              <tbody>
                {preview.rows.map((row) => (
                  <tr key={row.externalCode} className={tableRowClass}>
                    <td className="py-3 pl-6">
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
                    <td className="py-3">{row.stockQuantity}</td>
                    <td className="py-3">{row.costPrice ?? '—'}</td>
                    <td className="py-3">{row.price}</td>
                    <td className="py-3 pr-6">{row.sortOrder}</td>
                  </tr>
                ))}
              </tbody>
            </table>
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
