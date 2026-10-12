import { toast } from 'sonner'
import type { TableSessionSummary } from '../../domain/order/tableSessionRules'
import { formatCurrency } from './orderCardFormat'
import { useCloseTableSession } from './useTableSessions'

/** Resumo consolidado das comandas de mesa com pedido vindo de mais de 1 celular — kanban continua avançando pedido por pedido. */
export function TableSessionSummaryBar({ summaries }: { summaries: TableSessionSummary[] }) {
  const closeSession = useCloseTableSession()

  if (summaries.length === 0) return null

  return (
    <div className="flex flex-wrap items-center gap-2 text-sm">
      <span className="text-muted">Mesas abertas</span>
      {summaries.map((summary) => (
        <div
          key={summary.tableSessionId}
          className="flex items-center gap-2 rounded-full bg-surface py-1 pl-3.5 pr-1 font-body"
        >
          <span className="font-semibold">Mesa {summary.tableNumber}</span>
          <span className="tabular-nums text-muted">
            {summary.orderCount} {summary.orderCount === 1 ? 'pedido' : 'pedidos'}, {formatCurrency(summary.total)}
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
            className="rounded-full px-3 py-1.5 text-xs font-semibold text-lover transition-colors hover:bg-chosen disabled:cursor-not-allowed disabled:text-faint"
            title={summary.canClose ? undefined : 'Só fecha quando todo pedido da mesa estiver finalizado/cancelado'}
          >
            Fechar mesa
          </button>
        </div>
      ))}
    </div>
  )
}
