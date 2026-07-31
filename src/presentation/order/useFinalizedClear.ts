import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface FinalizedClearState {
  clearedAtByStore: Record<string, string>
  clearFinalized: (storeId: string) => void
}

/** Limpeza manual da coluna Finalizado — só esconde da tela, não apaga pedido do banco. */
export const useFinalizedClear = create<FinalizedClearState>()(
  persist(
    (set) => ({
      clearedAtByStore: {},
      clearFinalized: (storeId) =>
        set((state) => ({
          clearedAtByStore: { ...state.clearedAtByStore, [storeId]: new Date().toISOString() },
        })),
    }),
    { name: 'splash-finalized-clear' },
  ),
)
