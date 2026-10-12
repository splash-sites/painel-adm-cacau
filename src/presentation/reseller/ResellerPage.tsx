import { useState } from 'react'
import { useEffectiveStoreId } from '../storeContext/useEffectiveStoreId'
import { useStore } from '../store/useStores'
import { cardClass } from '../ui/styles'
import { OrderHistoryPage } from '../order/OrderHistoryPage'
import { ResellerStockPanel } from './ResellerStockPanel'

type ResellerTab = 'stock' | 'orders'

const TAB_LABEL: Record<ResellerTab, string> = {
  stock: 'Estoque',
  orders: 'Pedidos',
}

export function ResellerPage() {
  const storeId = useEffectiveStoreId()
  const { data: store, isLoading } = useStore(storeId)
  const [tab, setTab] = useState<ResellerTab>('stock')

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-[28px] font-bold leading-tight tracking-tight text-ink">Revendedores</h2>
          <p className="font-body text-sm text-muted">
            Estoque do canal de revenda e os pedidos feitos pelas revendedoras no cardápio.
          </p>
        </div>

        {store?.resellerEnabled && (
          <div className="flex gap-1 rounded-lg bg-surface-2 p-1">
            {(Object.keys(TAB_LABEL) as ResellerTab[]).map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => setTab(key)}
                className={`rounded-md px-3 py-1.5 text-sm font-body transition ${
                  tab === key
                    ? 'bg-surface text-ink shadow-sm'
                    : 'text-muted hover:text-ink'
                }`}
              >
                {TAB_LABEL[key]}
              </button>
            ))}
          </div>
        )}
      </div>

      {!storeId && <p className="font-body">Selecione uma loja pra ver os revendedores.</p>}
      {storeId && isLoading && <p className="font-body">Carregando...</p>}

      {storeId && store && !store.resellerEnabled && (
        <div className={cardClass}>
          <p className="font-body text-muted">
            Essa loja não atende revendedores. Ative "Revendedores" em Configurações pra liberar o canal.
          </p>
        </div>
      )}

      {storeId && store?.resellerEnabled && tab === 'stock' && <ResellerStockPanel storeId={storeId} />}
      {storeId && store?.resellerEnabled && tab === 'orders' && (
        <OrderHistoryPage salesChannel="reseller" embedded />
      )}
    </div>
  )
}
