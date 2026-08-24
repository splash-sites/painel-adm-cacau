export interface TableSessionRepository {
  /** IDs das sessões ainda abertas da loja — usado pra tirar do resumo do Dashboard uma sessão já fechada por outra aba/pessoa. */
  listOpenIds(storeId: string): Promise<string[]>
  /** Reforçado em RPC (close_table_session) — rejeita se algum pedido vinculado ainda não tá finalized/cancelled. */
  close(id: string): Promise<void>
}
