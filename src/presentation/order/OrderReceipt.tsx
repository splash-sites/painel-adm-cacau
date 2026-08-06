import type { Order } from '../../domain/order/Order'
import { calculateOrderTotal } from '../../domain/order/orderPricing'
import { orderChannelLabel } from '../../domain/order/orderStatusRules'
import { formatCpf, formatCurrency, formatName, formatPhone, itemTotal } from './orderCardFormat'

/**
 * Cupom pra impressora térmica (80mm) — impresso via window.print(), disparado só ao aceitar
 * o pedido (received -> preparing). Sem estilo de tela: monoespaçado, preto no branco,
 * independe do tema claro/escuro do app (ver printOrderReceipt.ts pro isolamento via @media print).
 */
export function OrderReceipt({
  order,
  storeName,
  attendantName,
}: {
  order: Order
  storeName: string
  attendantName: string
}) {
  const total = calculateOrderTotal(order)
  const orderNumber = order.id.slice(-8).toUpperCase()

  return (
    <div
      style={{
        fontFamily: "'Courier New', monospace",
        fontSize: 12,
        fontWeight: 700,
        color: '#000',
        width: '100%',
      }}
    >
      <div style={{ textAlign: 'center', fontWeight: 'bold', fontSize: 15 }}>{storeName}</div>
      <div style={{ textAlign: 'center' }}>Pedido #{orderNumber}</div>
      <div style={{ textAlign: 'center' }}>
        {new Date(order.createdAt).toLocaleString('pt-BR', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        })}
      </div>

      <Divider />

      <div>{orderChannelLabel(order)}</div>
      {order.tableNumber && <div>Mesa {order.tableNumber}</div>}
      {order.orderType === 'delivery' && order.deliveryAddress && (
        <div>
          {order.deliveryAddress.street}, {order.deliveryAddress.number}
          {order.deliveryAddress.complement && ` - ${order.deliveryAddress.complement}`}
          <br />
          {order.deliveryAddress.neighborhood} - {order.deliveryAddress.city}
        </div>
      )}

      <Divider />

      <div>Cliente: {order.customerName ? formatName(order.customerName) : 'Não identificado'}</div>
      {order.customerPhone && <div>Tel: {formatPhone(order.customerPhone)}</div>}
      {order.customerCpf && <div>CPF: {formatCpf(order.customerCpf)}</div>}

      <Divider />

      {order.items.map((item) => (
        <div key={item.id} style={{ marginBottom: 4 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>
              {item.quantity}x {item.productName}
            </span>
            <span>{formatCurrency(itemTotal(item))}</span>
          </div>
          {item.variations.map((variation) => (
            <div key={variation.id} style={{ paddingLeft: 12 }}>
              {variation.name}
              {variation.price > 0 &&
                (variation.priceMode === 'replace'
                  ? ` - ${formatCurrency(variation.price)}`
                  : ` (+${formatCurrency(variation.price)})`)}
            </div>
          ))}
          {item.addons.map((addon) => (
            <div key={addon.id} style={{ paddingLeft: 12 }}>
              + {addon.quantity > 1 && `${addon.quantity}x `}
              {addon.name}
              {addon.price > 0 && ` (+${formatCurrency(addon.price)})`}
            </div>
          ))}
          {item.notes && <div style={{ paddingLeft: 12, fontStyle: 'italic' }}>Obs: {item.notes}</div>}
        </div>
      ))}

      <Divider />

      <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: 14 }}>
        <span>Total</span>
        <span>{formatCurrency(total)}</span>
      </div>

      <Divider />

      <div>Atendente: {attendantName}</div>
    </div>
  )
}

function Divider() {
  return <div style={{ borderTop: '1px dashed #000', margin: '6px 0' }} />
}
