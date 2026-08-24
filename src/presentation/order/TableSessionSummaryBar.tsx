import { toast } from 'sonner'
import type { TableSessionSummary } from '../../domain/order/tableSessionRules'
import { cn } from '../ui/cn'
import { buttonClass } from '../ui/styles'
import { formatCurrency } from './orderCardFormat'
import { useCloseTableSession } from './useTableSessions'

/** Resumo consolidado das comandas de mesa com pedido vindo de mais de 1 celular — kanban continua avançando pedido por pedido. */
export function TableSessionSummaryBar({ summaries }: { summaries: TableSessionSummary[] }) {
  const closeSession = useCloseTableSession()

  if (summaries.length === 0) return null

  return (
    <div className="flex flex-wrap gap-2">
      {summaries.map((summary) => (
        <div
          key={summary.tableSessionId}
          className="flex items-center gap-3 rounded-lg border border-secondary/20 bg-secondary/5 px-3 py-2 text-sm font-body"
        >
          <span className="font-semibold">Mesa {summary.tableNumber}</span>
          <span className="text-foreground/60">
            {summary.orderCount} {summary.orderCount === 1 ? 'pedido' : 'pedidos'} · {formatCurrency(summary.total)}
          </span>
          <button
            type="button"
            disabled={!summary.canClose || closeSession.isPending}
            onClick={() =>
              closeSession.mutate(summary.tableSessionId, {
                onSuccess: () => toast.success('Comanda fechada.'),
                onError: (error) =>
                  toast.error(error instanceof Error ? error.message : 'Falha ao fechar comanda'),
              })
            }
            className={cn(buttonClass('outline'), 'px-2 py-1 text-xs disabled:opacity-40 disabled:cursor-not-allowed')}
            title={summary.canClose ? undefined : 'Só fecha quando todo pedido da mesa estiver finalizado/cancelado'}
          >
            Fechar mesa
          </button>
        </div>
      ))}
    </div>
  )
}
