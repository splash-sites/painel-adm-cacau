import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface StoreNotificationPrefs {
  soundEnabled: boolean
  browserNotificationEnabled: boolean
}

export const DEFAULT_NOTIFICATION_PREFS: StoreNotificationPrefs = {
  soundEnabled: true,
  browserNotificationEnabled: true,
}

interface NotificationSettingsState {
  prefsByStore: Record<string, StoreNotificationPrefs>
  setSoundEnabled: (storeId: string, value: boolean) => void
  setBrowserNotificationEnabled: (storeId: string, value: boolean) => void
}

/** Preferência de alerta é por loja — quem administra várias lojas pode querer som só em algumas. */
export const useNotificationSettings = create<NotificationSettingsState>()(
  persist(
    (set) => ({
      prefsByStore: {},
      setSoundEnabled: (storeId, value) =>
        set((state) => ({
          prefsByStore: {
            ...state.prefsByStore,
            [storeId]: { ...(state.prefsByStore[storeId] ?? DEFAULT_NOTIFICATION_PREFS), soundEnabled: value },
          },
        })),
      setBrowserNotificationEnabled: (storeId, value) =>
        set((state) => ({
          prefsByStore: {
            ...state.prefsByStore,
            [storeId]: {
              ...(state.prefsByStore[storeId] ?? DEFAULT_NOTIFICATION_PREFS),
              browserNotificationEnabled: value,
            },
          },
        })),
    }),
    { name: 'splash-notification-settings' },
  ),
)

export function getNotificationPrefs(storeId: string): StoreNotificationPrefs {
  return useNotificationSettings.getState().prefsByStore[storeId] ?? DEFAULT_NOTIFICATION_PREFS
}
