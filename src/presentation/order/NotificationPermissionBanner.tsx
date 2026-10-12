import { useState } from 'react'
import { Bell } from 'lucide-react'
import { DEFAULT_NOTIFICATION_PREFS, useNotificationSettings } from '../settings/useNotificationSettings'
import { Button } from '../ui/Button'

function getPermission(): NotificationPermission | 'unsupported' {
  return typeof Notification === 'undefined' ? 'unsupported' : Notification.permission
}

/**
 * A preferência de notificação nasce ligada, mas a permissão do navegador nasce "default"
 * (nunca pedida) — e pedir exige gesto do usuário. Cobre "denied" também: sem aviso aqui,
 * um bloqueio acidental (ex: dispensou o prompt do Chrome sem querer) fica invisível pro
 * usuário, que só percebe pelo sintoma "não notifica".
 */
export function NotificationPermissionBanner({ storeId }: { storeId: string }) {
  const [permission, setPermission] = useState(getPermission)
  const { browserNotificationEnabled } = useNotificationSettings(
    (state) => state.prefsByStore[storeId] ?? DEFAULT_NOTIFICATION_PREFS,
  )

  if (permission === 'unsupported' || permission === 'granted' || !browserNotificationEnabled) return null

  async function handleEnable() {
    setPermission(await Notification.requestPermission())
  }

  const isDenied = permission === 'denied'

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-wait-soft px-4 py-3 font-body">
      <div className="flex items-center gap-3">
        <Bell className="h-5 w-5 shrink-0 text-wait" />
        <div>
          <p className="text-sm font-medium text-ink">
            Aviso de pedido novo desligado neste computador
          </p>
          <p className="text-sm text-wait">
            {isDenied
              ? 'O navegador bloqueou o aviso. Clique no cadeado ao lado do endereço do site e libere "Notificações".'
              : 'Sem essa permissão, pedido novo não aparece como aviso na tela.'}
          </p>
        </div>
      </div>
      {!isDenied && (
        <Button variant="outline" onClick={handleEnable} className="shrink-0">
          Ativar notificações
        </Button>
      )}
    </div>
  )
}
