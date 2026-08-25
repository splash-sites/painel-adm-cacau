import type { OrderItem } from '../../domain/order/Order'
import { groupOrderItemsByPromotion } from '../../domain/order/orderItemGrouping'
import { formatCurrency, itemTotal } from './orderCardFormat'

function OrderItemRow({ item }: { item: OrderItem }) {
  return (
    <li>
      <div className="flex items-start justify-between gap-2">
        <span className="min-w-0">
          <span className="font-medium">{item.quantity}×</span> {item.productName}
        </span>
        <span className="shrink-0 whitespace-nowrap text-foreground/70">{formatCurrency(itemTotal(item))}</span>
      </div>
      {(item.variations.length > 0 || item.addons.length > 0) && (
        <ul className="pl-4 text-xs text-foreground/60">
          {item.variations.map((variation) => (
            <li key={variation.id}>
              {variation.name}
              {variation.price > 0 &&
                (variation.priceMode === 'replace'
                  ? ` — ${formatCurrency(variation.price)}`
                  : ` (+${formatCurrency(variation.price)})`)}
            </li>
          ))}
          {item.addons.map((addon) => (
            <li key={addon.id}>
              + {addon.quantity > 1 && `${addon.quantity}x `}
              {addon.name}
              {addon.price > 0 && ` (+${formatCurrency(addon.price)})`}
            </li>
          ))}
        </ul>
      )}
      {item.notes && <p className="pl-4 text-xs italic text-secondary">Obs: {item.notes}</p>}
    </li>
  )
}

/** Itens do mesmo combo (mesmo promotionId) ficam num bloco só, pra ficar claro que vieram juntos. */
export function OrderItemsList({ items }: { items: OrderItem[] }) {
  const groups = groupOrderItemsByPromotion(items)

  return (
    <div className="space-y-2">
      {groups.map((group) =>
        group.promotionId ? (
          <div key={group.promotionId} className="rounded-lg border border-primary/25 bg-primary/5 p-2">
            <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-primary">Combo</span>
            <ul className="text-sm space-y-1.5">
              {group.items.map((item) => (
                <OrderItemRow key={item.id} item={item} />
              ))}
            </ul>
          </div>
        ) : (
          <ul key={group.items[0].id} className="text-sm space-y-1.5">
            <OrderItemRow item={group.items[0]} />
          </ul>
        ),
      )}
    </div>
  )
}
