import { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import type { Order, OrderStatus } from '../../domain/order/Order'
import { orderChannelLabel, statusLabel } from '../../domain/order/orderStatusRules'
import { calculateOrderTotal } from '../../domain/order/orderPricing'
import { useEffectiveStoreId } from '../storeContext/useEffectiveStoreId'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/Select'
import { cardClass, tableCardClass, tableHeaderCellClass, tableRowClass } from '../ui/styles'
import { OrderDetailsDrawer } from './OrderDetailsDrawer'
import { BADGE_COLOR, STATUS_DOT_CLASS, formatCurrency, formatName } from './orderCardFormat'
import { type HistoryPeriod, useOrderHistory } from './useOrderHistory'

const PAGE_SIZE_OPTIONS = [10, 20, 50] as const

const PERIOD_LABEL: Record<HistoryPeriod, string> = {
  today: 'Hoje',
  '7d': '7 dias',
  '30d': '30 dias',
  all: 'Tudo',
}

const STATUS_OPTIONS: OrderStatus[] = [
  'received',
  'preparing',
  'out_for_delivery',
  'delivered',
  'finalized',
  'cancelled',
]

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function OrderHistoryPage() {
  const storeId = useEffectiveStoreId()
  const [period, setPeriod] = useState<HistoryPeriod>('30d')
  const [statusFilter, setStatusFilter] = useState<'all' | OrderStatus>('all')
  const [page, setPage] = useState(0)
  const [pageSize, setPageSize] = useState<number>(10)
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)

  const status = statusFilter === 'all' ? undefined : statusFilter
  const { data, isLoading, error } = useOrderHistory(storeId, period, status, page, pageSize)

  const totalPages = data ? Math.max(1, Math.ceil(data.total / pageSize)) : 1

  function handlePeriodChange(next: HistoryPeriod) {
    setPeriod(next)
    setPage(0)
  }

  function handleStatusChange(value: string) {
    setStatusFilter(value as 'all' | OrderStatus)
    setPage(0)
  }

  function handlePageSizeChange(value: string) {
    setPageSize(Number(value))
    setPage(0)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl md:text-3xl text-accent">Histórico</h2>
          <p className="font-body text-sm text-foreground/60">
            Todos os pedidos da loja, em qualquer status — inclusive cancelado, com o motivo.
          </p>
        </div>

        {storeId && (
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex gap-1 rounded-lg bg-secondary/10 p-1">
              {(Object.keys(PERIOD_LABEL) as HistoryPeriod[]).map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => handlePeriodChange(key)}
                  className={`rounded-md px-3 py-1.5 text-sm font-body transition ${
                    period === key
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-foreground/60 hover:text-foreground'
                  }`}
                >
                  {PERIOD_LABEL[key]}
                </button>
              ))}
            </div>

            <Select value={statusFilter} onValueChange={handleStatusChange}>
              <SelectTrigger className="w-auto min-w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os status</SelectItem>
                {STATUS_OPTIONS.map((option) => (
                  <SelectItem key={option} value={option}>
                    {statusLabel(option)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {!storeId && <p className="font-body">Selecione uma loja pra ver o histórico.</p>}
      {isLoading && <p className="font-body">Carregando...</p>}
      {error != null && <p className="font-body text-red-600">Erro ao carregar histórico</p>}

      {data && data.items.length === 0 && (
        <div className={cardClass}>
          <p className="font-body text-foreground/70">Nenhum pedido encontrado nesse filtro.</p>
        </div>
      )}

      {data && data.items.length > 0 && (
        <div className={`${tableCardClass} overflow-x-auto`}>
          <table className="w-full min-w-[900px] text-left font-body">
            <thead>
              <tr className="h-11">
                <th className={`${tableHeaderCellClass} pl-6`}>Horário</th>
                <th className={tableHeaderCellClass}>Cliente</th>
                <th className={tableHeaderCellClass}>Canal</th>
                <th className={tableHeaderCellClass}>Status</th>
                <th className={tableHeaderCellClass}>Total</th>
                <th className={tableHeaderCellClass}>Motivo do cancelamento</th>
                <th className={`${tableHeaderCellClass} pr-6`}></th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((order) => (
                <tr key={order.id} className={tableRowClass}>
                  <td className="py-3 pl-6 whitespace-nowrap text-sm">{formatDateTime(order.createdAt)}</td>
                  <td className="py-3 truncate">
                    {order.customerName ? formatName(order.customerName) : 'Não identificado'}
                  </td>
                  <td className="py-3">
                    <span
                      className={`rounded-full text-xs px-2 py-0.5 whitespace-nowrap ${BADGE_COLOR[orderChannelLabel(order)]}`}
                    >
                      {orderChannelLabel(order)}
                    </span>
                  </td>
                  <td className="py-3 whitespace-nowrap">
                    <span className="flex items-center gap-2 text-sm">
                      <span className={`h-2 w-2 rounded-full shrink-0 ${STATUS_DOT_CLASS[order.status]}`} />
                      {statusLabel(order.status, order.orderType)}
                    </span>
                  </td>
                  <td className="py-3 whitespace-nowrap">{formatCurrency(calculateOrderTotal(order))}</td>
                  <td className="py-3 max-w-[220px] truncate text-foreground/70">
                    {order.cancellationReason ?? '—'}
                  </td>
                  <td className="py-3 pr-6 text-right">
                    <button
                      type="button"
                      onClick={() => setSelectedOrder(order)}
                      className="text-sm text-foreground/70 hover:text-foreground"
                    >
                      Detalhes
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="flex h-11 items-center justify-end gap-6 border-t border-secondary/15 px-6 font-body text-sm">
            <div className="flex items-center gap-2">
              <span className="text-foreground/60">Linhas por página:</span>
              <Select value={String(pageSize)} onValueChange={handlePageSizeChange}>
                <SelectTrigger className="w-auto gap-1.5 border-none py-1 text-sm hover:bg-secondary/10">
                  <SelectValue>{pageSize}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {PAGE_SIZE_OPTIONS.map((size) => (
                    <SelectItem key={size} value={String(size)}>
                      {size}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <span className="text-foreground/60">
              {page * pageSize + 1}–{Math.min((page + 1) * pageSize, data.total)} de {data.total}
            </span>

            <div className="flex items-center">
              <button
                type="button"
                aria-label="Página anterior"
                disabled={page === 0}
                onClick={() => setPage((current) => current - 1)}
                className="rounded-md p-1.5 text-foreground/50 hover:bg-secondary/10 hover:text-foreground disabled:pointer-events-none disabled:opacity-40"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                aria-label="Próxima página"
                disabled={page + 1 >= totalPages}
                onClick={() => setPage((current) => current + 1)}
                className="rounded-md p-1.5 text-foreground/50 hover:bg-secondary/10 hover:text-foreground disabled:pointer-events-none disabled:opacity-40"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedOrder && <OrderDetailsDrawer order={selectedOrder} onClose={() => setSelectedOrder(null)} />}
    </div>
  )
}
