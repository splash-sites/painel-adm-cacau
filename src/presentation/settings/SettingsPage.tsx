import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ExternalLink } from 'lucide-react'
import { toast } from 'sonner'
import type { Store } from '../../domain/store/Store'
import { useAuth } from '../auth/useAuth'
import { useActiveStore } from '../storeContext/useActiveStore'
import { useEffectiveStoreId } from '../storeContext/useEffectiveStoreId'
import { useDeleteStore, useSaveStore, useStore } from '../store/useStores'
import { Button } from '../ui/Button'
import { ConfirmModal } from '../ui/ConfirmModal'
import { Switch } from '../ui/Switch'
import { buttonClass } from '../ui/styles'
import { SettingsToggleRow } from './SettingsToggleRow'
import { StoreDataForm } from './StoreDataForm'
import { TableQrSection } from './TableQrSection'
import { DEFAULT_NOTIFICATION_PREFS, useNotificationSettings } from './useNotificationSettings'

type ChannelKey = 'supportsDineIn' | 'supportsPickup' | 'supportsDelivery' | 'resellerEnabled'
type SectionKey = 'loja' | 'pedidos' | 'avisos' | 'mesas' | 'fechar'

const CHANNELS: { key: ChannelKey; label: string }[] = [
  { key: 'supportsDineIn', label: 'Cafeteria' },
  { key: 'supportsPickup', label: 'Retirada no balcão' },
  { key: 'supportsDelivery', label: 'Entrega' },
  { key: 'resellerEnabled', label: 'Revenda' },
]

function getInitialPermission(): NotificationPermission | 'unsupported' {
  return typeof Notification === 'undefined' ? 'unsupported' : Notification.permission
}

export function SettingsPage() {
  const storeId = useEffectiveStoreId()
  const { data: store } = useStore(storeId || undefined)
  const storefrontUrl = import.meta.env.VITE_STOREFRONT_URL

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-col gap-0.5">
          <h2 className="font-display text-[28px] font-bold leading-tight tracking-tight text-ink">Configurações</h2>
          {store && <span className="text-sm text-muted">{store.name}</span>}
        </div>
        {store && storefrontUrl && (
          <a
            href={`${storefrontUrl}/${store.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className={buttonClass('outline')}
          >
            <ExternalLink className="h-4 w-4" aria-hidden="true" />
            Abrir cardápio
          </a>
        )}
      </div>

      {!storeId && (
        <div className="rounded-[20px] bg-surface p-5">
          <p className="text-muted">Escolha uma unidade no menu para ver as configurações dela.</p>
        </div>
      )}

      {store && <SettingsSections key={store.id} store={store} />}
    </div>
  )
}

function SettingsSections({ store }: { store: Store }) {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { session } = useAuth()
  const isSuperAdmin = session?.profile.role === 'super_admin'
  const setActiveStoreId = useActiveStore((state) => state.setActiveStoreId)
  const saveStore = useSaveStore()
  const deleteStore = useDeleteStore()
  const [confirmAction, setConfirmAction] = useState<'toggle-active' | 'delete' | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const setSoundEnabled = useNotificationSettings((state) => state.setSoundEnabled)
  const setBrowserNotificationEnabled = useNotificationSettings((state) => state.setBrowserNotificationEnabled)
  const { soundEnabled, browserNotificationEnabled } = useNotificationSettings(
    (state) => state.prefsByStore[store.id] ?? DEFAULT_NOTIFICATION_PREFS,
  )
  const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>(getInitialPermission)

  const enabledChannels = CHANNELS.filter((channel) => store[channel.key])
  const notificationSummary =
    permission === 'denied'
      ? 'Notificação bloqueada'
      : [soundEnabled ? 'Som ligado' : 'Som desligado', browserNotificationEnabled && permission === 'granted' ? 'notificação ligada' : null]
          .filter(Boolean)
          .join(', ')

  const sections: { key: SectionKey; title: string; summary: string; tone?: 'wait' | 'danger' }[] = [
    { key: 'loja', title: 'Loja', summary: 'Nome, link e WhatsApp' },
    {
      key: 'pedidos',
      title: 'Como o cliente pede',
      summary: enabledChannels.length ? enabledChannels.map((channel) => channel.label).join(', ') : 'Nenhum canal ligado',
      tone: enabledChannels.length ? undefined : 'wait',
    },
    {
      key: 'avisos',
      title: 'Aviso de pedido novo',
      summary: notificationSummary,
      tone: permission === 'denied' ? 'wait' : undefined,
    },
    ...(store.supportsDineIn ? [{ key: 'mesas' as const, title: 'Mesas e QR Code', summary: 'Um QR por mesa' }] : []),
    {
      key: 'fechar',
      title: store.active ? 'Fechar ou excluir a loja' : 'Abrir ou excluir a loja',
      summary: store.active ? 'Recebendo pedidos' : 'Loja fechada',
      tone: 'danger',
    },
  ]

  const requested = searchParams.get('secao') as SectionKey | null
  const current = sections.find((section) => section.key === requested) ?? sections[0]

  function selectSection(key: SectionKey) {
    setSearchParams(key === 'loja' ? {} : { secao: key }, { replace: true })
  }

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
    <div className="flex flex-col gap-5 md:flex-row md:items-start">
      <nav
        aria-label="Seções das configurações"
        className="scrollbar-hidden -mx-5 flex gap-1 overflow-x-auto px-5 md:mx-0 md:w-60 md:shrink-0 md:flex-col md:gap-0.5 md:overflow-visible md:px-0"
      >
        {sections.map((section, index) => {
          const active = section.key === current.key
          const isLast = index === sections.length - 1
          return (
            <div key={section.key} className="contents">
              {isLast && <span aria-hidden="true" className="mx-3.5 my-2 hidden h-px bg-line-strong md:block" />}
              <button
                type="button"
                aria-current={active ? 'page' : undefined}
                onClick={() => selectSection(section.key)}
                className={`flex shrink-0 flex-col gap-px rounded-[14px] px-3.5 py-2.5 text-left transition-colors ${
                  active ? 'bg-surface shadow-[inset_3px_0_0_var(--color-caramel)]' : 'hover:bg-surface/60'
                }`}
              >
                <span
                  className={`whitespace-nowrap text-[15px] ${active ? 'font-semibold' : ''} ${
                    section.tone === 'danger' ? 'text-danger' : 'text-ink'
                  }`}
                >
                  {section.title}
                </span>
                <span
                  className={`hidden text-[13px] md:block ${
                    section.tone === 'wait' ? 'text-wait' : section.key === 'fechar' && !store.active ? 'text-danger' : 'text-muted'
                  }`}
                >
                  {section.summary}
                </span>
              </button>
            </div>
          )
        })}
      </nav>

      <section className="flex min-h-[420px] min-w-0 flex-1 flex-col gap-5 rounded-[20px] bg-surface p-6 md:p-7">
        <div className="flex flex-col gap-1">
          <h3 className={`font-display text-2xl font-bold ${current.key === 'fechar' ? 'text-danger' : ''}`}>{current.title}</h3>
          <p className="text-sm text-muted">
            {
              {
                loja: 'O que o cliente vê no topo do cardápio.',
                pedidos: 'Como o cliente pode pedir nesta loja. O que estiver desligado some do cardápio na hora.',
                avisos: 'Vale só para este computador. Cada computador da loja escolhe o seu.',
                mesas: 'Imprima um QR Code para cada mesa.',
                fechar: store.active
                  ? 'Fechar para de receber pedidos pelo cardápio, sem apagar nada.'
                  : 'A loja está fechada. Abra para voltar a receber pedidos.',
              }[current.key]
            }
          </p>
        </div>

        {current.key === 'loja' && <StoreDataForm store={store} />}

        {current.key === 'pedidos' && (
          <div className="flex max-w-xl flex-col">
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
        )}

        {current.key === 'avisos' && (
          <div className="flex max-w-xl flex-col gap-3">
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
              <p className="rounded-xl bg-wait-soft px-3.5 py-2.5 text-sm text-wait">
                Para liberar, clique no cadeado ao lado do endereço do site e permita "Notificações".
              </p>
            )}
          </div>
        )}

        {current.key === 'mesas' && <TableQrSection store={store} />}

        {current.key === 'fechar' && (
          <div className="flex flex-col gap-3">
            {deleteError && <p className="text-sm text-danger">{deleteError}</p>}
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                className={store.active ? 'text-danger' : ''}
                onClick={() => setConfirmAction('toggle-active')}
                disabled={saveStore.isPending}
              >
                {store.active ? 'Fechar loja' : 'Abrir loja'}
              </Button>
              {isSuperAdmin && (
                <Button variant="danger-ghost" onClick={() => setConfirmAction('delete')} disabled={deleteStore.isPending}>
                  {deleteStore.isPending ? 'Excluindo...' : 'Excluir loja'}
                </Button>
              )}
            </div>
            {isSuperAdmin && (
              <p className="text-[13px] text-muted">Excluir só funciona se a loja não tiver produto, pedido nem usuário.</p>
            )}
          </div>
        )}
      </section>

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
    </div>
  )
}
