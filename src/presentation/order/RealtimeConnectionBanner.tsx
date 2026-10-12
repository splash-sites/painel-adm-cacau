import { WifiOff } from 'lucide-react'
import { useRealtimeConnection } from './useRealtimeConnection'

/** Canal Realtime de pedidos caiu — kanban continua funcionando via refetchInterval (30s), isso só avisa que o tempo real parou. */
export function RealtimeConnectionBanner() {
  const status = useRealtimeConnection((state) => state.status)

  if (status === 'connected') return null

  return (
    <div className="flex items-center gap-3 rounded-2xl bg-wait-soft px-4 py-3 font-body">
      <WifiOff className="h-5 w-5 shrink-0 text-wait" />
      <p className="text-sm font-medium text-ink">
        A conexão em tempo real caiu. Pedido novo pode levar até 30 segundos para aparecer aqui.
      </p>
    </div>
  )
}
