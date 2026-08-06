import { createRoot } from 'react-dom/client'
import type { Order } from '../../domain/order/Order'
import { OrderReceipt } from './OrderReceipt'

/**
 * Impressão via window.print() nativo do navegador — sem servidor/app de ponte, só o driver
 * da impressora instalado no Windows (ver CLAUDE.md, "Feature: Impressão de pedido"). O cupom
 * monta numa raiz React isolada fora de #root; @media print (index.css) esconde tudo que não
 * for #print-receipt-root na hora de imprimir.
 */
export function printOrderReceipt(order: Order, storeName: string, attendantName: string) {
  const container = document.createElement('div')
  container.id = 'print-receipt-root'
  document.body.appendChild(container)

  const root = createRoot(container)
  root.render(<OrderReceipt order={order} storeName={storeName} attendantName={attendantName} />)

  function cleanup() {
    window.removeEventListener('afterprint', cleanup)
    root.unmount()
    container.remove()
  }
  window.addEventListener('afterprint', cleanup)

  // dá tempo do React pintar o conteúdo antes do diálogo de impressão abrir
  requestAnimationFrame(() => window.print())
}
