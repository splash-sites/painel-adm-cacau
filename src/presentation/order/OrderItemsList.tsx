import type { OrderItem } from '../../domain/order/Order'
import { groupOrderItemsByPromotion } from '../../domain/order/orderItemGrouping'
import { formatCurrency, itemTotal } from './orderCardFormat'

function OrderItemRow({ item }: { item: OrderItem }) {
  const choices = [
    ...item.variations.map((variation) => variation.name),
    ...item.addons.map((addon) => (addon.quantity > 1 ? `${addon.quantity}× ${addon.name}` : addon.name)),
  ]

  return (
    <li className="flex flex-col gap-1">
      <div className="flex items-start justify-between gap-2 tabular-nums">
        <span className="min-w-0">
          {item.quantity}× {item.productName}
          {choices.length > 0 && <span className="text-muted"> {choices.join(', ')}</span>}
        </span>
        <span className="shrink-0 whitespace-nowrap">{formatCurrency(itemTotal(item)).replace('R$', '').trim()}</span>
      </div>
      {item.notes && <span className="rounded-lg bg-chosen px-2 py-1.5 text-xs text-lover">{item.notes}</span>}
    </li>
  )
}

/** Itens do mesmo combo (mesmo promotionId) ficam num bloco só, pra ficar claro que vieram juntos. */
export function OrderItemsList({ items }: { items: OrderItem[] }) {
  const groups = groupOrderItemsByPromotion(items)

  return (
    <div className="flex flex-col gap-1.5 text-sm">
      {groups.map((group) =>
        group.promotionId ? (
          <div key={group.promotionId} className="rounded-xl border-[1.5px] border-caramel/50 bg-chosen p-2">
            <span className="mb-1 block text-xs font-semibold text-lover">Combo</span>
            <ul className="flex flex-col gap-1.5">
              {group.items.map((item) => (
                <OrderItemRow key={item.id} item={item} />
              ))}
            </ul>
          </div>
        ) : (
          <ul key={group.items[0].id} className="flex flex-col gap-1.5">
            <OrderItemRow item={group.items[0]} />
          </ul>
        ),
      )}
    </div>
  )
}
