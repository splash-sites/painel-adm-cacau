import { useState } from 'react'
import { Bell } from 'lucide-react'
import { DEFAULT_NOTIFICATION_PREFS, useNotificationSettings } from '../settings/useNotificationSettings'
import { Button } from '../ui/Button'

function getPermission(): NotificationPermission | 'unsupported' {
  return typeof Notification === 'undefined' ? 'unsupported' : Notification.permission
}

/**
 * A preferência de notificação nasce ligada, mas a permissão do navegador nasce "default"
 * (nunca pedida) — e pedir exige gesto do usuário. Sem este banner, o alerta de pedido novo
 * falha em silêncio em todo PC de loja que nunca abriu Configurações.
 */
export function NotificationPermissionBanner({ storeId }: { storeId: string }) {
  const [permission, setPermission] = useState(getPermission)
  const { browserNotificationEnabled } = useNotificationSettings(
    (state) => state.prefsByStore[storeId] ?? DEFAULT_NOTIFICATION_PREFS,
  )

  if (permission !== 'default' || !browserNotificationEnabled) return null

  async function handleEnable() {
    setPermission(await Notification.requestPermission())
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 font-body">
      <div className="flex items-center gap-3">
        <Bell className="h-5 w-5 shrink-0 text-amber-600" />
        <div>
          <p className="text-sm font-medium text-amber-900">
            Notificação de pedido novo está desativada neste computador
          </p>
          <p className="text-sm text-amber-800/80">
            O navegador ainda não tem permissão — sem ela, pedido novo não gera aviso na tela.
          </p>
        </div>
      </div>
      <Button variant="outline" onClick={handleEnable} className="shrink-0">
        Ativar notificações
      </Button>
    </div>
  )
}
