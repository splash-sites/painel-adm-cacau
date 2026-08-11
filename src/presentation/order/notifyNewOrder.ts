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
    // tag: vários pedidos em sequência substituem o banner anterior em vez de empilhar
    new Notification('Novo pedido', { body: 'Um novo pedido chegou no dashboard.', tag: 'splash-new-order' })
  }
}
