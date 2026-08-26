import { create } from 'zustand'
import type { RealtimeConnectionStatus } from '../../application/order/OrderRepository'

interface RealtimeConnectionState {
  status: RealtimeConnectionStatus
  setStatus: (status: RealtimeConnectionStatus) => void
}

/** Estado de conexão do canal Realtime de pedidos — sem persist, some ao recarregar (reconecta do zero). */
export const useRealtimeConnection = create<RealtimeConnectionState>((set) => ({
  status: 'connected',
  setStatus: (status) => set({ status }),
}))
