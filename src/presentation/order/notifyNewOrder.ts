import { toast } from 'sonner'
import { getNotificationPrefs } from '../settings/useNotificationSettings'
import { playNotificationSound } from './playNotificationSound'

/** `renotify` existe na API real do navegador, mas falta no tipo `NotificationOptions` do TypeScript. */
interface BrowserNotificationOptions extends NotificationOptions {
  renotify?: boolean
}

export function notifyNewOrder(storeId: string): void {
  toast('Novo pedido recebido')

  const prefs = getNotificationPrefs(storeId)

  if (prefs.soundEnabled) {
    playNotificationSound()
  }

  if (prefs.browserNotificationEnabled && typeof Notification !== 'undefined' && Notification.permission === 'granted') {
    // tag: pedidos em sequência substituem o popup anterior em vez de empilhar.
    // renotify: sem isso, a substituição é silenciosa (sem popup novo) a partir do 2º pedido.
    const options: BrowserNotificationOptions = {
      body: 'Um novo pedido chegou no dashboard.',
      tag: 'splash-new-order',
      renotify: true,
    }
    new Notification('Novo pedido', options)
  }
}
