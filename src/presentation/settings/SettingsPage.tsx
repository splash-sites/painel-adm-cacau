import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import type { Store } from '../../domain/store/Store'
import { useAuth } from '../auth/useAuth'
import { useActiveStore } from '../storeContext/useActiveStore'
import { useEffectiveStoreId } from '../storeContext/useEffectiveStoreId'
import { useDeleteStore, useSaveStore, useStore } from '../store/useStores'
import { Button } from '../ui/Button'
import { ConfirmModal } from '../ui/ConfirmModal'
import { Switch } from '../ui/Switch'
import { formatPhone } from '../order/orderCardFormat'
import { settingsCardClass, SettingsCardTitle, SettingsPill, SettingsToggleRow } from './SettingsCard'
import { StoreDataDialog } from './StoreDataDialog'
import { TableQrCard } from './TableQrCard'
import { DEFAULT_NOTIFICATION_PREFS, useNotificationSettings } from './useNotificationSettings'

type ChannelKey = 'supportsDineIn' | 'supportsPickup' | 'supportsDelivery' | 'resellerEnabled'

const CHANNELS: { key: ChannelKey; label: string }[] = [
  { key: 'supportsDineIn', label: 'Cafeteria' },
  { key: 'supportsPickup', label: 'Retirada no balcão' },
  { key: 'supportsDelivery', label: 'Entrega' },
  { key: 'resellerEnabled', label: 'Revenda' },
]

function getInitialPermission(): NotificationPermission | 'unsupported' {
  return typeof Notification === 'undefined' ? 'unsupported' : Notification.permission
}

/** WhatsApp é guardado só com dígitos e DDI (5551999998888); na tela aparece como telefone. */
function formatWhatsapp(digits: string | null): string {
  if (!digits) return 'Não cadastrado'
  const local = digits.startsWith('55') && digits.length >= 12 ? digits.slice(2) : digits
  return formatPhone(local)
}

export function SettingsPage() {
  const storeId = useEffectiveStoreId()
  const { data: store } = useStore(storeId || undefined)

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-col gap-0.5">
          <h2 className="font-display text-[28px] font-bold leading-tight tracking-tight text-ink">Configurações</h2>
          {store && <span className="text-sm text-muted">{store.name}</span>}
        </div>
        {store &&
          (store.active ? (
            <span className="inline-flex items-center gap-2 rounded-full bg-success-soft px-3.5 py-1.5 text-sm font-semibold text-success">
              <span className="h-2 w-2 rounded-full bg-success" aria-hidden="true" />
              Recebendo pedidos
            </span>
          ) : (
            <span className="inline-flex items-center gap-2 rounded-full bg-danger-soft px-3.5 py-1.5 text-sm font-semibold text-danger">
              <span className="h-2 w-2 rounded-full bg-danger" aria-hidden="true" />
              Loja fechada
            </span>
          ))}
      </div>

      {!storeId && (
        <div className={settingsCardClass}>
          <p className="text-muted">Escolha uma unidade no menu para ver as configurações dela.</p>
        </div>
      )}

      {store && <SettingsCards key={store.id} store={store} />}
    </div>
  )
}

function SettingsCards({ store }: { store: Store }) {
  const navigate = useNavigate()
  const { session } = useAuth()
  const isSuperAdmin = session?.profile.role === 'super_admin'
  const setActiveStoreId = useActiveStore((state) => state.setActiveStoreId)
  const saveStore = useSaveStore()
  const deleteStore = useDeleteStore()
  const [editingData, setEditingData] = useState(false)
  const [confirmAction, setConfirmAction] = useState<'toggle-active' | 'delete' | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const setSoundEnabled = useNotificationSettings((state) => state.setSoundEnabled)
  const setBrowserNotificationEnabled = useNotificationSettings((state) => state.setBrowserNotificationEnabled)
  const { soundEnabled, browserNotificationEnabled } = useNotificationSettings(
    (state) => state.prefsByStore[store.id] ?? DEFAULT_NOTIFICATION_PREFS,
  )
  const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>(getInitialPermission)

  const storefrontUrl = import.meta.env.VITE_STOREFRONT_URL
  const menuUrl = storefrontUrl ? `${storefrontUrl}/${store.slug}` : null
  const enabledChannels = CHANNELS.filter((channel) => store[channel.key]).length
  const notificationProblem =
    browserNotificationEnabled && (permission === 'denied' || permission === 'default')

  async function updateStore(changes: Partial<Store>, successMessage: string) {
    try {
      await saveStore.mutateAsync({ id: store.id, input: { ...store, ...changes } })
      toast.success(successMessage)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível salvar a loja.')
    }
  }

  async function handleToggleBrowserNotification(checked: boolean) {
    if (!checked) {
      setBrowserNotificationEnabled(store.id, false)
      return
    }
    if (permission === 'default') {
      const result = await Notification.requestPermission()
      setPermission(result)
      if (result !== 'granted') return
    }
    setBrowserNotificationEnabled(store.id, true)
  }

  async function handleToggleActive() {
    await updateStore({ active: !store.active }, store.active ? 'Loja fechada para pedidos.' : 'Loja aberta para pedidos.')
    setConfirmAction(null)
  }

  async function handleDeleteStore() {
    setDeleteError(null)
    try {
      await deleteStore.mutateAsync(store.id)
      setActiveStoreId(null)
      navigate('/')
    } catch (error) {
      setDeleteError(error instanceof Error ? error.message : 'Não foi possível excluir a loja.')
    } finally {
      setConfirmAction(null)
    }
  }

  const notificationHint =
    permission === 'denied'
      ? 'Bloqueada neste navegador'
      : permission === 'unsupported'
        ? 'Este navegador não tem notificação'
        : permission === 'default'
          ? 'Ao ligar, o navegador pede permissão'
          : undefined

  return (
    <>
      <div className="grid grid-cols-1 items-start gap-3.5 md:grid-cols-2 lg:grid-cols-3">
        <article className={settingsCardClass}>
          <SettingsCardTitle>Loja</SettingsCardTitle>
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
            <dt className="text-muted">Nome</dt>
            <dd className="min-w-0 truncate">{store.name}</dd>
            <dt className="text-muted">Link</dt>
            <dd className="min-w-0 truncate">
              {menuUrl ? (
                <a href={menuUrl} target="_blank" rel="noopener noreferrer" className="font-semibold text-lover hover:underline">
                  …/{store.slug}
                </a>
              ) : (
                `…/${store.slug}`
              )}
            </dd>
            <dt className="text-muted">WhatsApp</dt>
            <dd className="min-w-0 truncate tabular-nums">{formatWhatsapp(store.whatsappNumber)}</dd>
          </dl>
          <Button variant="outline" onClick={() => setEditingData(true)}>
            Editar dados
          </Button>
        </article>

        <article className={settingsCardClass}>
          <div className="flex items-start justify-between gap-2">
            <SettingsCardTitle>Como o cliente pede</SettingsCardTitle>
            <SettingsPill tone={enabledChannels === 0 ? 'wait' : 'info'}>
              {enabledChannels} de {CHANNELS.length}
            </SettingsPill>
          </div>
          <div className="flex flex-col">
            {CHANNELS.map((channel) => (
              <SettingsToggleRow
                key={channel.key}
                label={channel.label}
                control={
                  <Switch
                    aria-label={channel.label}
                    checked={store[channel.key]}
                    disabled={saveStore.isPending}
                    onCheckedChange={(checked) =>
                      updateStore(
                        { [channel.key]: checked },
                        checked ? `${channel.label} ligada no cardápio.` : `${channel.label} desligada no cardápio.`,
                      )
                    }
                  />
                }
              />
            ))}
          </div>
        </article>

        <article className={settingsCardClass}>
          <div className="flex items-start justify-between gap-2">
            <SettingsCardTitle>Aviso de pedido novo</SettingsCardTitle>
            {notificationProblem ? (
              <SettingsPill tone="wait">Atenção</SettingsPill>
            ) : (
              <SettingsPill tone="muted">Neste computador</SettingsPill>
            )}
          </div>
          <div className="flex flex-col">
            <SettingsToggleRow
              label="Tocar som"
              control={
                <Switch
                  aria-label="Tocar som"
                  checked={soundEnabled}
                  onCheckedChange={(checked) => setSoundEnabled(store.id, checked)}
                />
              }
            />
            <SettingsToggleRow
              label="Notificação na tela"
              hint={notificationHint}
              hintTone={permission === 'denied' ? 'wait' : 'muted'}
              control={
                <Switch
                  aria-label="Notificação na tela"
                  checked={browserNotificationEnabled && permission === 'granted'}
                  disabled={permission === 'denied' || permission === 'unsupported'}
                  onCheckedChange={handleToggleBrowserNotification}
                />
              }
            />
          </div>
          {permission === 'denied' && (
            <p className="text-[13px] text-muted">
              Para liberar, clique no cadeado ao lado do endereço do site e permita "Notificações".
            </p>
          )}
        </article>

        {store.supportsDineIn && <TableQrCard store={store} />}

        <article className={`${settingsCardClass} ring-[1.5px] ring-inset ring-danger-soft`}>
          <SettingsCardTitle>
            <span className="text-danger">{store.active ? 'Fechar a loja' : 'Abrir a loja'}</span>
          </SettingsCardTitle>
          <p className="text-sm text-muted">
            {store.active
              ? 'Para de receber pedidos pelo cardápio, sem apagar nada.'
              : 'A loja está fechada. Abra para voltar a receber pedidos.'}
          </p>
          {deleteError && <p className="text-sm text-danger">{deleteError}</p>}
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              className={store.active ? 'flex-1 text-danger' : 'flex-1'}
              onClick={() => setConfirmAction('toggle-active')}
              disabled={saveStore.isPending}
            >
              {store.active ? 'Fechar loja' : 'Abrir loja'}
            </Button>
            {isSuperAdmin && (
              <Button
                variant="danger-ghost"
                className="flex-1"
                onClick={() => setConfirmAction('delete')}
                disabled={deleteStore.isPending}
              >
                {deleteStore.isPending ? 'Excluindo...' : 'Excluir loja'}
              </Button>
            )}
          </div>
        </article>
      </div>

      {editingData && <StoreDataDialog store={store} onClose={() => setEditingData(false)} />}

      {confirmAction === 'toggle-active' && (
        <ConfirmModal
          title={store.active ? 'Fechar a loja?' : 'Abrir a loja?'}
          description={
            store.active
              ? `"${store.name}" para de receber pedidos pelo cardápio. Dá para abrir de novo aqui.`
              : `"${store.name}" volta a receber pedidos pelo cardápio.`
          }
          confirmLabel={store.active ? 'Fechar loja' : 'Abrir loja'}
          pendingLabel="Salvando..."
          confirmVariant={store.active ? 'danger' : 'primary'}
          isPending={saveStore.isPending}
          onClose={() => setConfirmAction(null)}
          onConfirm={handleToggleActive}
        />
      )}

      {confirmAction === 'delete' && (
        <ConfirmModal
          title="Excluir a loja?"
          description={`"${store.name}" é apagada de vez. Só funciona se ela não tiver produto, pedido nem usuário.`}
          confirmLabel="Excluir loja"
          pendingLabel="Excluindo..."
          confirmVariant="danger"
          isPending={deleteStore.isPending}
          onClose={() => setConfirmAction(null)}
          onConfirm={handleDeleteStore}
        />
      )}
    </>
  )
}
