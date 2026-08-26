import { WifiOff } from 'lucide-react'
import { useRealtimeConnection } from './useRealtimeConnection'

/** Canal Realtime de pedidos caiu — kanban continua funcionando via refetchInterval (30s), isso só avisa que o tempo real parou. */
export function RealtimeConnectionBanner() {
  const status = useRealtimeConnection((state) => state.status)

  if (status === 'connected') return null

  return (
    <div className="flex items-center gap-3 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 font-body">
      <WifiOff className="h-5 w-5 shrink-0 text-amber-600" />
      <p className="text-sm font-medium text-amber-900">
        Conexão em tempo real caiu — pedido novo pode levar até 30s pra aparecer aqui.
      </p>
    </div>
  )
}
