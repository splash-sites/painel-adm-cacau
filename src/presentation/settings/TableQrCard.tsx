import { useEffect, useState } from 'react'
import { Printer } from 'lucide-react'
import QRCode from 'qrcode'
import { toast } from 'sonner'
import type { Store } from '../../domain/store/Store'
import { buildTableMenuUrl, tableNumberRange } from '../../domain/store/tableQrUrl'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { useDebouncedValue } from '../ui/useDebouncedValue'
import { printTableQrCodes } from './printTableQrCodes'
import { settingsCardClass, SettingsCardTitle } from './SettingsCard'

const MAX_TABLES = 100

/** Card largo de Configurações: gera e imprime um QR Code por mesa. */
export function TableQrCard({ store }: { store: Store }) {
  const [tableFrom, setTableFrom] = useState('1')
  const [tableTo, setTableTo] = useState('10')
  const [isGenerating, setIsGenerating] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const debouncedFrom = useDebouncedValue(tableFrom, 400)
  const storefrontUrl = import.meta.env.VITE_STOREFRONT_URL

  const numbers = tableNumberRange(Number(tableFrom), Number(tableTo))
  const tableCount = numbers.length
  const rangeOk = tableCount > 0 && tableCount <= MAX_TABLES

  useEffect(() => {
    if (!storefrontUrl || !debouncedFrom) {
      setPreviewUrl(null)
      return
    }
    let cancelled = false
    QRCode.toDataURL(buildTableMenuUrl(storefrontUrl, store.slug, debouncedFrom), { margin: 1, width: 160 })
      .then((url) => !cancelled && setPreviewUrl(url))
      .catch(() => !cancelled && setPreviewUrl(null))
    return () => {
      cancelled = true
    }
  }, [storefrontUrl, store.slug, debouncedFrom])

  async function handleGenerate() {
    if (!storefrontUrl) {
      toast.error('Falta o endereço do cardápio (VITE_STOREFRONT_URL) para gerar o QR Code.')
      return
    }
    if (!rangeOk) return
    setIsGenerating(true)
    try {
      await printTableQrCodes(store.name, store.slug, storefrontUrl, numbers)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível gerar os QR Codes.')
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <article className={`${settingsCardClass} lg:col-span-2`}>
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="flex shrink-0 items-center gap-3">
          {previewUrl ? (
            <img
              src={previewUrl}
              alt={`QR Code da mesa ${tableFrom}`}
              className="h-24 w-24 rounded-xl border border-line bg-white p-1.5"
            />
          ) : (
            <div className="grid h-24 w-24 place-items-center rounded-xl bg-tile font-display text-2xl text-lover" aria-hidden="true">
              {tableFrom || '?'}
            </div>
          )}
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <SettingsCardTitle>Mesas e QR Code</SettingsCardTitle>
          <p className="text-sm text-muted">
            Um QR por mesa, para imprimir e colar. O cliente escaneia e o pedido já entra na conta da mesa.
          </p>
          <p className={`text-[13px] font-semibold ${rangeOk ? 'text-lover' : 'text-danger'}`}>
            {tableCount === 0
              ? '"Da mesa" precisa ser menor ou igual a "até"'
              : tableCount > MAX_TABLES
                ? `São ${tableCount} mesas. Dá para gerar até ${MAX_TABLES} por vez`
                : `${tableCount} ${tableCount === 1 ? 'QR Code' : 'QR Codes'}, mesa ${tableFrom} até ${tableTo}`}
          </p>
        </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 border-t border-line pt-4">
          <label htmlFor="tableFrom" className="text-sm text-muted">
            Da mesa
          </label>
          <Input
            id="tableFrom"
            type="number"
            min={1}
            className="w-20 text-center"
            value={tableFrom}
            onChange={(event) => setTableFrom(event.target.value)}
          />
          <label htmlFor="tableTo" className="text-sm text-muted">
            até
          </label>
          <Input
            id="tableTo"
            type="number"
            min={1}
            className="w-20 text-center"
            value={tableTo}
            onChange={(event) => setTableTo(event.target.value)}
          />
          <Button onClick={handleGenerate} disabled={isGenerating || !rangeOk}>
            <Printer className="h-4 w-4" aria-hidden="true" />
            {isGenerating ? 'Gerando...' : 'Gerar e imprimir'}
          </Button>
        </div>
      </div>
    </article>
  )
}
