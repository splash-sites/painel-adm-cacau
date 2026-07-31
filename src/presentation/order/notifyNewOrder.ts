import { toast } from 'sonner'
import { getNotificationPrefs } from '../settings/useNotificationSettings'
import { playNotificationSound } from './playNotificationSound'

export function notifyNewOrder(storeId: string): void {
  toast('Novo pedido recebido')

  const prefs = getNotificationPrefs(storeId)

  if (prefs.soundEnabled) {
    playNotificationSound()
  }

  if (prefs.browserNotificationEnabled && typeof Notification !== 'undefined' && Notification.permission === 'granted') {
    new Notification('Novo pedido', { body: 'Um novo pedido chegou no dashboard.' })
  }
}
