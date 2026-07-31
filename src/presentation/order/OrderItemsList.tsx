import type { OrderItem } from '../../domain/order/Order'
import { formatCurrency, itemTotal } from './orderCardFormat'

export function OrderItemsList({ items }: { items: OrderItem[] }) {
  return (
    <ul className="text-sm space-y-1.5">
      {items.map((item) => (
        <li key={item.id}>
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
      ))}
    </ul>
  )
}
