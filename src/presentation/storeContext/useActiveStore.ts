import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface ActiveStoreState {
  activeStoreId: string | null
  setActiveStoreId: (storeId: string | null) => void
}

export const useActiveStore = create<ActiveStoreState>()(
  persist(
    (set) => ({
      activeStoreId: null,
      setActiveStoreId: (storeId) => set({ activeStoreId: storeId }),
    }),
    { name: 'splash-active-store' },
  ),
)
