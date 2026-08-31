import { useState } from 'react'
import { Download } from 'lucide-react'
import { toast } from 'sonner'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { useEffectiveStoreId } from '../storeContext/useEffectiveStoreId'
import { useStore } from '../store/useStores'
import { initials } from '../ui/initials'
import { Button } from '../ui/Button'
import { cardClass } from '../ui/styles'
import { downloadReportWorkbook } from './downloadReportWorkbook'
import { type ReportPeriod, useReportSummary } from './useReportSummary'

const PERIOD_LABEL: Record<ReportPeriod, string> = {
  today: 'Hoje',
  '7d': '7 dias',
  '30d': '30 dias',
}

const CHART_PRIMARY = '#CF9047'
const CHART_ACCENT = '#2C120B'

const CHANNEL_CHART_COLOR: Record<string, string> = {
  Cafeteria: '#2C120B',
  'Retirar no local': '#7B431B',
  Delivery: '#B91C1C',
  Revendedor: '#CF9047',
}

function formatCurrency(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function chartTick() {
  return { fill: '#030404', fontSize: 12, fontFamily: 'Inter, sans-serif' }
}

function ChartTooltip({
  active,
  payload,
  label,
  formatter,
}: {
  active?: boolean
  payload?: { value: number; name?: string }[]
  label?: string
  formatter: (value: number) => string
}) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border border-secondary/15 bg-background px-3 py-2 text-xs font-body shadow-lg">
      {label && <p className="font-medium text-foreground">{label}</p>}
      {payload.map((entry, index) => (
        <p key={index} className="text-foreground/70">
          {entry.name ? `${entry.name}: ` : ''}
          {formatter(entry.value)}
        </p>
      ))}
    </div>
  )
}

export function ReportsPage() {
  const storeId = useEffectiveStoreId()
  const [period, setPeriod] = useState<ReportPeriod>('today')
  const [isExporting, setIsExporting] = useState(false)
  const { data: store } = useStore(storeId)
  const { summary, revenueSeries, ordersByHour, avgPrepTimeMinutes, newVsReturning, isLoading, error } =
    useReportSummary(storeId, period)

  const peakHourCount = ordersByHour ? Math.max(...ordersByHour.map((point) => point.count)) : 0

  async function handleExport() {
    if (!summary) return
    setIsExporting(true)
    try {
      await downloadReportWorkbook(
        summary,
        avgPrepTimeMinutes,
        newVsReturning,
        store?.name ?? 'Loja',
        period,
        `relatorio-${period}-${new Date().toISOString().slice(0, 10)}.xlsx`,
      )
    } catch (exportError) {
      toast.error(exportError instanceof Error ? exportError.message : 'Falha ao exportar planilha')
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl md:text-3xl text-accent">Relatórios</h2>
          <p className="font-body text-sm text-foreground/60">Período: {PERIOD_LABEL[period]}</p>
        </div>
        {storeId && (
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex gap-1 rounded-lg bg-secondary/10 p-1">
              {(Object.keys(PERIOD_LABEL) as ReportPeriod[]).map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setPeriod(key)}
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
            <Button
              variant="outline"
              onClick={handleExport}
              disabled={!summary || isExporting}
              className="gap-1.5 text-sm"
            >
              <Download className="h-4 w-4" />
              {isExporting ? 'Exportando...' : 'Exportar planilha'}
            </Button>
          </div>
        )}
      </div>

      {!storeId && (
        <div className={cardClass}>
          <p className="font-body text-foreground/70">Selecione uma loja pra ver os relatórios.</p>
        </div>
      )}
      {isLoading && <p className="font-body">Carregando...</p>}
      {error != null && <p className="font-body text-red-600">Erro ao carregar relatório</p>}

      {summary && (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <div className={cardClass}>
              <p className="font-body text-sm text-foreground/60">Faturamento</p>
              <p className="font-display text-2xl text-accent">{formatCurrency(summary.totalRevenue)}</p>
              <p className="font-body text-xs text-foreground/50">{summary.orderCount} pedido(s)</p>
            </div>
            <div className={cardClass}>
              <p className="font-body text-sm text-foreground/60">Ticket médio</p>
              <p className="font-display text-2xl text-accent">{formatCurrency(summary.averageTicket)}</p>
            </div>
            <div className={cardClass}>
              <p className="font-body text-sm text-foreground/60">Canal mais usado</p>
              <p className="font-display text-2xl text-accent">{summary.channelBreakdown[0]?.label ?? '—'}</p>
              <p className="font-body text-xs text-foreground/50">
                {summary.channelBreakdown[0]
                  ? `${summary.channelBreakdown[0].orderCount} pedido(s)`
                  : 'Sem pedido no período'}
              </p>
            </div>
            <div className={cardClass}>
              <p className="font-body text-sm text-foreground/60">Taxa de cancelamento</p>
              <p className="font-display text-2xl text-accent">
                {summary.orderCount + summary.cancelledCount > 0
                  ? `${((summary.cancelledCount / (summary.orderCount + summary.cancelledCount)) * 100).toFixed(1)}%`
                  : '—'}
              </p>
              <p className="font-body text-xs text-foreground/50">{summary.cancelledCount} cancelado(s)</p>
            </div>
            <div className={cardClass}>
              <p className="font-body text-sm text-foreground/60">Tempo médio de preparo</p>
              <p className="font-display text-2xl text-accent">
                {avgPrepTimeMinutes != null ? `${Math.round(avgPrepTimeMinutes)} min` : '—'}
              </p>
              <p className="font-body text-xs text-foreground/50">
                {avgPrepTimeMinutes != null ? 'received → preparing → próxima etapa' : 'Sem pedido concluído'}
              </p>
            </div>
          </div>

          {/* Faturamento ao longo do tempo + Canais */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <div className={`${cardClass} lg:col-span-2`}>
              <h3 className="font-body font-medium">Faturamento ao longo do tempo</h3>
              {revenueSeries && revenueSeries.length > 0 ? (
                <div className="mt-3 h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={revenueSeries}>
                      <defs>
                        <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={CHART_PRIMARY} stopOpacity={0.4} />
                          <stop offset="95%" stopColor={CHART_PRIMARY} stopOpacity={0.05} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#7B431B" strokeOpacity={0.1} />
                      <XAxis dataKey="label" tick={chartTick()} axisLine={false} tickLine={false} />
                      <YAxis tick={chartTick()} axisLine={false} tickLine={false} width={40} />
                      <Tooltip content={<ChartTooltip formatter={formatCurrency} />} />
                      <Area
                        type="monotone"
                        dataKey="revenue"
                        stroke={CHART_PRIMARY}
                        strokeWidth={2}
                        fill="url(#revenueFill)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <p className="mt-2 font-body text-sm text-foreground/60">Sem venda no período.</p>
              )}
            </div>

            <div className={cardClass}>
              <h3 className="font-body font-medium">Canais de venda</h3>
              {summary.channelBreakdown.length > 0 ? (
                <div className="mt-3 h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={summary.channelBreakdown}
                        dataKey="orderCount"
                        nameKey="label"
                        cx="50%"
                        cy="50%"
                        innerRadius="55%"
                        outerRadius="80%"
                        paddingAngle={2}
                        isAnimationActive={false}
                      >
                        {summary.channelBreakdown.map((channel) => (
                          <Cell key={channel.label} fill={CHANNEL_CHART_COLOR[channel.label] ?? CHART_PRIMARY} />
                        ))}
                      </Pie>
                      <Tooltip content={<ChartTooltip formatter={(value) => `${value} pedido(s)`} />} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <p className="mt-2 font-body text-sm text-foreground/60">Sem pedido no período.</p>
              )}
              <ul className="mt-2 space-y-1">
                {summary.channelBreakdown.map((channel) => (
                  <li key={channel.label} className="flex items-center gap-2 font-body text-xs text-foreground/70">
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{ backgroundColor: CHANNEL_CHART_COLOR[channel.label] ?? CHART_PRIMARY }}
                    />
                    {channel.label} · {channel.orderCount}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Pedidos por horário + Ticket médio por canal */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <div className={`${cardClass} lg:col-span-2`}>
              <h3 className="font-body font-medium">Pedidos por horário</h3>
              {ordersByHour && ordersByHour.some((point) => point.count > 0) ? (
                <div className="mt-3 h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={ordersByHour}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#7B431B" strokeOpacity={0.1} />
                      <XAxis
                        dataKey="hour"
                        tickFormatter={(hour: number) => `${String(hour).padStart(2, '0')}h`}
                        tick={chartTick()}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis tick={chartTick()} axisLine={false} tickLine={false} width={30} allowDecimals={false} />
                      <Tooltip
                        content={
                          <ChartTooltip formatter={(value) => `${value} pedido(s)`} />
                        }
                      />
                      <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                        {ordersByHour.map((point) => (
                          <Cell
                            key={point.hour}
                            fill={point.count === peakHourCount && peakHourCount > 0 ? CHART_ACCENT : CHART_PRIMARY}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <p className="mt-2 font-body text-sm text-foreground/60">Sem pedido no período.</p>
              )}
            </div>

            <div className={cardClass}>
              <h3 className="font-body font-medium">Ticket médio por canal</h3>
              {summary.channelBreakdown.length > 0 ? (
                <div className="mt-3 h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={summary.channelBreakdown} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="#7B431B" strokeOpacity={0.1} />
                      <XAxis type="number" tick={chartTick()} axisLine={false} tickLine={false} />
                      <YAxis
                        type="category"
                        dataKey="label"
                        tick={chartTick()}
                        axisLine={false}
                        tickLine={false}
                        width={90}
                      />
                      <Tooltip content={<ChartTooltip formatter={formatCurrency} />} />
                      <Bar dataKey="averageTicket" radius={[0, 4, 4, 0]}>
                        {summary.channelBreakdown.map((channel) => (
                          <Cell key={channel.label} fill={CHANNEL_CHART_COLOR[channel.label] ?? CHART_PRIMARY} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <p className="mt-2 font-body text-sm text-foreground/60">Sem pedido no período.</p>
              )}
            </div>
          </div>

          {/* Rankings */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className={cardClass}>
              <h3 className="font-body font-medium">Produtos mais vendidos</h3>
              {summary.topProducts.length === 0 && (
                <p className="mt-2 font-body text-sm text-foreground/60">Sem venda no período.</p>
              )}
              {summary.topProducts.length > 0 && (
                <ol className="mt-3 space-y-2">
                  {summary.topProducts.slice(0, 5).map((product, index) => (
                    <li key={product.productId} className="flex items-center justify-between font-body text-sm">
                      <span>
                        <span className="text-foreground/40">{index + 1}.</span> {product.productName}
                      </span>
                      <span className="text-foreground/60">{product.quantitySold}x</span>
                    </li>
                  ))}
                </ol>
              )}
            </div>

            <div className={cardClass}>
              <h3 className="font-body font-medium">Ranking de atendente</h3>
              {summary.attendantRanking.length === 0 && (
                <p className="mt-2 font-body text-sm text-foreground/60">Sem pedido preparado no período.</p>
              )}
              {summary.attendantRanking.length > 0 && (
                <ol className="mt-3 space-y-2">
                  {summary.attendantRanking.map((attendant, index) => (
                    <li
                      key={attendant.attendantId}
                      className="flex items-center justify-between gap-2 font-body text-sm"
                    >
                      <span className="flex items-center gap-2 min-w-0">
                        <span className="text-foreground/40 shrink-0">{index + 1}.</span>
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/20 text-xs font-semibold text-accent">
                          {initials(attendant.attendantName)}
                        </span>
                        <span className="truncate">{attendant.attendantName}</span>
                      </span>
                      <span className="shrink-0 text-right text-foreground/60">
                        {formatCurrency(attendant.revenue)}
                        <span className="block text-xs text-foreground/40">{attendant.orderCount} pedido(s)</span>
                      </span>
                    </li>
                  ))}
                </ol>
              )}
            </div>
          </div>

          {/* Novos vs recorrentes */}
          <div className={cardClass}>
            <h3 className="font-body font-medium">Clientes novos vs. recorrentes</h3>
            {newVsReturning && newVsReturning.newCustomers + newVsReturning.returningCustomers > 0 ? (
              <div className="mt-3 flex items-center gap-6">
                <div>
                  <p className="font-display text-2xl text-accent">{newVsReturning.newCustomers}</p>
                  <p className="font-body text-xs text-foreground/50">Novos</p>
                </div>
                <div>
                  <p className="font-display text-2xl text-accent">{newVsReturning.returningCustomers}</p>
                  <p className="font-body text-xs text-foreground/50">Recorrentes</p>
                </div>
              </div>
            ) : (
              <p className="mt-2 font-body text-sm text-foreground/60">Sem cliente identificado no período.</p>
            )}
          </div>
        </>
      )}
    </div>
  )
}
