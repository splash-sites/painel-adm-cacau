import type { QueryClient } from '@tanstack/react-query'

/**
 * Invalida tanto o cache do Dashboard/kanban (['orders', ...]) quanto o do Histórico e da
 * aba Pedidos de Revendedores, que reusa a mesma tela (['order-history', ...]).
 *
 * Bug real: toda mutação de pedido (mudar status, reverter, cancelar, editar item, fechar mesa)
 * e o Realtime de pedido novo (useOrderNotifications) só invalidavam ['orders']. Como
 * ['order-history', ...] tem prefixo diferente, o React Query nunca casava — quem estava no
 * Histórico só via a mudança depois de sair e voltar da tela (remontar refaz o fetch do zero).
 * Usar este helper em vez de invalidar ['orders'] direto evita reintroduzir isso.
 */
export function invalidateOrderQueries(queryClient: QueryClient): void {
  queryClient.invalidateQueries({ queryKey: ['orders'] })
  queryClient.invalidateQueries({ queryKey: ['order-history'] })
}
