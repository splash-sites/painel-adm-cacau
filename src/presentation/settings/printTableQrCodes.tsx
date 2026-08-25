import QRCode from 'qrcode'
import { createRoot } from 'react-dom/client'
import { buildTableMenuUrl } from '../../domain/store/tableQrUrl'
import { TableQrSheet } from './TableQrSheet'

/**
 * Mesmo mecanismo de printOrderReceipt.tsx (raiz React isolada fora de #root, @media print
 * em index.css esconde o resto), mas a folha de QR é impressão normal (A4), não cupom
 * térmico — por isso o @page de impressão é sobrescrito por um <style> injetado só durante
 * esse print, removido junto no cleanup.
 */
export async function printTableQrCodes(
  storeName: string,
  storeSlug: string,
  storefrontUrl: string,
  tableNumbers: string[],
) {
  const items = await Promise.all(
    tableNumbers.map(async (tableNumber) => ({
      tableNumber,
      dataUrl: await QRCode.toDataURL(buildTableMenuUrl(storefrontUrl, storeSlug, tableNumber), {
        margin: 1,
        width: 300,
      }),
    })),
  )

  const container = document.createElement('div')
  container.id = 'print-qr-root'
  document.body.appendChild(container)

  const pageStyle = document.createElement('style')
  pageStyle.textContent = '@media print { @page { size: auto; margin: 12mm; } }'
  document.head.appendChild(pageStyle)

  const root = createRoot(container)
  root.render(<TableQrSheet storeName={storeName} items={items} />)

  function cleanup() {
    window.removeEventListener('afterprint', cleanup)
    root.unmount()
    container.remove()
    pageStyle.remove()
  }
  window.addEventListener('afterprint', cleanup)

  requestAnimationFrame(() => window.print())
}
