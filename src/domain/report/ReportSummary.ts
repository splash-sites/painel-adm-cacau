export interface ProductRanking {
  productId: string
  productName: string
  quantitySold: number
}

export interface ChannelCount {
  label: string
  orderCount: number
  revenue: number
  averageTicket: number
}

export interface AttendantRanking {
  attendantId: string
  attendantName: string
  orderCount: number
  revenue: number
}

export interface ReportSummary {
  orderCount: number
  totalRevenue: number
  averageTicket: number
  /** Pedido cancelado nunca conta em nenhuma outra métrica — só aqui, pra calcular taxa de cancelamento. */
  cancelledCount: number
  /** Ordenado do mais vendido pro menos vendido — quem exibe decide quantos mostrar (ex: top 5). */
  topProducts: ProductRanking[]
  /** Ordenado do canal mais usado pro menos usado. */
  channelBreakdown: ChannelCount[]
  /** Ordenado de quem mais preparou pedido pra quem menos preparou. Pedido ainda em "received" (sem atendente) não conta. */
  attendantRanking: AttendantRanking[]
}
