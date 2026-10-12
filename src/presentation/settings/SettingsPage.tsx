import { useEffect, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Check, Printer, QrCode } from 'lucide-react'
import QRCode from 'qrcode'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { storeSchema, type StoreFormInput } from '../../application/store/storeSchema'
import type { Store } from '../../domain/store/Store'
import { buildTableMenuUrl, tableNumberRange } from '../../domain/store/tableQrUrl'
import { useAuth } from '../auth/useAuth'
import { useActiveStore } from '../storeContext/useActiveStore'
import { useEffectiveStoreId } from '../storeContext/useEffectiveStoreId'
import { useDeleteStore, useSaveStore, useStore } from '../store/useStores'
import { Button } from '../ui/Button'
import { Checkbox } from '../ui/Checkbox'
import { ConfirmModal } from '../ui/ConfirmModal'
import { Input } from '../ui/Input'
import { Label } from '../ui/Label'
import { Switch } from '../ui/Switch'
import { cardClass } from '../ui/styles'
import { useDebouncedValue } from '../ui/useDebouncedValue'
import { DEFAULT_NOTIFICATION_PREFS, useNotificationSettings } from './useNotificationSettings'
import { printTableQrCodes } from './printTableQrCodes'

function getInitialPermission(): NotificationPermission | 'unsupported' {
  return typeof Notification === 'undefined' ? 'unsupported' : Notification.permission
}

export function SettingsPage() {
  const navigate = useNavigate()
  const { session } = useAuth()
  const isSuperAdmin = session?.profile.role === 'super_admin'
  const setActiveStoreId = useActiveStore((state) => state.setActiveStoreId)
  const setSoundEnabled = useNotificationSettings((state) => state.setSoundEnabled)
  const setBrowserNotificationEnabled = useNotificationSettings((state) => state.setBrowserNotificationEnabled)
  const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>(getInitialPermission)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [confirmAction, setConfirmAction] = useState<'toggle-active' | 'delete' | null>(null)

  const storeId = useEffectiveStoreId()
  const { data: store } = useStore(storeId || undefined)
  const saveStore = useSaveStore()
  const deleteStore = useDeleteStore()
  const { soundEnabled, browserNotificationEnabled } = useNotificationSettings(
    (state) => state.prefsByStore[storeId] ?? DEFAULT_NOTIFICATION_PREFS,
  )

  async function handleToggleBrowserNotification(checked: boolean) {
    if (!checked) {
      setBrowserNotificationEnabled(storeId, false)
      return
    }

    if (permission === 'default') {
      const result = await Notification.requestPermission()
      setPermission(result)
      if (result !== 'granted') return
    }

    setBrowserNotificationEnabled(storeId, true)
  }

  async function handleDeleteStore() {
    if (!store) return
    setDeleteError(null)
    try {
      await deleteStore.mutateAsync(store.id)
      setActiveStoreId(null)
      navigate('/')
    } catch (error) {
      setDeleteError(error instanceof Error ? error.message : 'Falha ao excluir loja')
    } finally {
      setConfirmAction(null)
    }
  }

  async function handleToggleActive() {
    if (!store) return
    try {
      await saveStore.mutateAsync({ id: store.id, input: { ...store, active: !store.active } })
      toast.success(store.active ? 'Loja desativada.' : 'Loja ativada.')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Falha ao atualizar loja')
    } finally {
      setConfirmAction(null)
    }
  }

  const permissionLabel = {
    granted: 'ativada',
    denied: 'bloqueada pelo navegador',
    default: 'não configurada',
    unsupported: 'não suportada nesse navegador',
  }[permission]

  return (
    <div className="space-y-6">
      <h2 className="font-display text-[28px] font-bold leading-tight tracking-tight text-ink">Configurações</h2>

      {!storeId && (
        <div className={cardClass}>
          <p className="font-body text-muted">Selecione uma loja pra ver as configurações dela.</p>
        </div>
      )}

      {store && <StoreDataForm key={store.id} store={store} />}

      <div className={`${cardClass} space-y-4`}>
        <div>
          <h3 className="font-body font-medium">Alerta de pedido novo</h3>
          <p className="text-sm font-body text-muted">
            Toast, som e notificação do navegador quando chegar pedido novo no dashboard.
          </p>
        </div>

        <div className="flex items-center justify-between gap-3">
          <span className="font-body">Tocar som</span>
          <Switch
            checked={soundEnabled}
            onCheckedChange={(checked) => setSoundEnabled(storeId, checked)}
          />
        </div>

        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="font-body">Notificação do navegador</p>
            <p className="text-sm font-body text-muted">
              {permission === 'denied'
                ? 'Bloqueado nas configurações do navegador. Libere por lá antes de ligar aqui.'
                : permission === 'default'
                  ? 'O navegador ainda não deu permissão. Ao ligar, ele pergunta.'
                  : `Status: ${permissionLabel}`}
            </p>
          </div>
          <Switch
            checked={browserNotificationEnabled && permission === 'granted'}
            disabled={permission === 'denied' || permission === 'unsupported'}
            onCheckedChange={handleToggleBrowserNotification}
          />
        </div>
      </div>

      {store && (
        <div className={`${cardClass} space-y-3`}>
          <h3 className="font-body font-medium text-danger">Zona de risco</h3>
          <p className="text-sm font-body text-muted">
            Desativar fecha a loja para pedidos sem apagar nada. Excluir apaga a loja de vez, e só funciona
            se ela não tiver produto, pedido nem usuário.
          </p>
          {deleteError && <p className="text-sm text-danger">{deleteError}</p>}
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => setConfirmAction('toggle-active')}
              disabled={saveStore.isPending}
            >
              {store.active ? 'Desativar loja' : 'Ativar loja'}
            </Button>
            {isSuperAdmin && (
              <Button
                variant="danger-ghost"
                onClick={() => setConfirmAction('delete')}
                disabled={deleteStore.isPending}
              >
                {deleteStore.isPending ? 'Excluindo...' : 'Excluir loja'}
              </Button>
            )}
          </div>
        </div>
      )}

      {store && confirmAction === 'toggle-active' && (
        <ConfirmModal
          title={store.active ? 'Desativar loja' : 'Ativar loja'}
          description={
            store.active
              ? `"${store.name}" vai parar de aceitar pedido no storefront.`
              : `"${store.name}" volta a aceitar pedido no storefront.`
          }
          confirmLabel={store.active ? 'Confirmar desativação' : 'Confirmar ativação'}
          pendingLabel="Salvando..."
          confirmVariant={store.active ? 'danger' : 'primary'}
          isPending={saveStore.isPending}
          onClose={() => setConfirmAction(null)}
          onConfirm={handleToggleActive}
        />
      )}

      {store && confirmAction === 'delete' && (
        <ConfirmModal
          title="Excluir loja"
          description={`Excluir "${store.name}"? Essa ação não pode ser desfeita.`}
          confirmLabel="Confirmar exclusão"
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

function StoreDataForm({ store }: { store: Store }) {
  const saveStore = useSaveStore()
  const [tableFrom, setTableFrom] = useState('1')
  const [tableTo, setTableTo] = useState('10')
  const [isGeneratingQr, setIsGeneratingQr] = useState(false)
  const [qrPreviewUrl, setQrPreviewUrl] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    watch,
    control,
    formState: { errors, isSubmitting },
  } = useForm<StoreFormInput>({
    resolver: zodResolver(storeSchema),
    defaultValues: { ...store, whatsappNumber: store.whatsappNumber ?? '' },
  })

  const slug = watch('slug')
  const supportsDineIn = watch('supportsDineIn')

  const tableCount = tableNumberRange(Number(tableFrom), Number(tableTo)).length
  const debouncedTableFrom = useDebouncedValue(tableFrom, 400)

  useEffect(() => {
    const storefrontUrl = import.meta.env.VITE_STOREFRONT_URL
    if (!storefrontUrl || !slug || !debouncedTableFrom) {
      setQrPreviewUrl(null)
      return
    }
    let cancelled = false
    QRCode.toDataURL(buildTableMenuUrl(storefrontUrl, slug, debouncedTableFrom), { margin: 1, width: 160 })
      .then((url) => {
        if (!cancelled) setQrPreviewUrl(url)
      })
      .catch(() => {
        if (!cancelled) setQrPreviewUrl(null)
      })
    return () => {
      cancelled = true
    }
  }, [slug, debouncedTableFrom])

  async function handleGenerateQrCodes() {
    if (!import.meta.env.VITE_STOREFRONT_URL) {
      toast.error('Configure VITE_STOREFRONT_URL no .env.local pra gerar o QR Code.')
      return
    }
    const numbers = tableNumberRange(Number(tableFrom), Number(tableTo))
    if (numbers.length === 0) {
      toast.error('Intervalo de mesa inválido.')
      return
    }
    if (numbers.length > 100) {
      toast.error('Dá para gerar até 100 mesas por vez.')
      return
    }
    setIsGeneratingQr(true)
    try {
      await printTableQrCodes(store.name, slug, import.meta.env.VITE_STOREFRONT_URL, numbers)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Falha ao gerar os QR Codes.')
    } finally {
      setIsGeneratingQr(false)
    }
  }

  async function onSubmitStore(input: StoreFormInput) {
    try {
      await saveStore.mutateAsync({
        id: store.id,
        input: {
          ...input,
          whatsappNumber: input.whatsappNumber ? input.whatsappNumber.replace(/\D/g, '') || null : null,
        },
      })
      toast.success('Loja atualizada.')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Falha ao salvar loja')
    }
  }

  return (
    <>
    <form onSubmit={handleSubmit(onSubmitStore)} className={`space-y-5 ${cardClass}`} noValidate>
      <div>
        <h3 className="font-body font-medium">Dados da loja</h3>
        <p className="text-sm font-body text-muted">Nome e link do cardápio que o cliente vê.</p>
      </div>

      <div className="space-y-1">
        <Label htmlFor="name">Nome da unidade</Label>
        <Input id="name" {...register('name')} />
        {errors.name && <p className="text-sm text-danger">{errors.name.message}</p>}
      </div>

      <div className="space-y-1">
        <Label htmlFor="slug">Slug</Label>
        <p className="text-sm font-body text-muted">
          Parte do endereço do cardápio (sem espaço, sem acento): cardapio.splashpedidos/
          <span className="font-medium">seu-slug</span>
        </p>
        <Input id="slug" {...register('slug')} />
        {errors.slug && <p className="text-sm text-danger">{errors.slug.message}</p>}
        {slug && (
          <a
            href={`${import.meta.env.VITE_STOREFRONT_URL}/${slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block text-sm text-lover hover:text-lover transition-colors"
          >
            Ver cardápio →
          </a>
        )}
      </div>

      <div className="space-y-1">
        <Label htmlFor="whatsappNumber">WhatsApp</Label>
        <p className="text-sm font-body text-muted">
          Só números, com DDI e DDD (ex: 5551999998888). É o número que o cliente chama pelo WhatsApp.
        </p>
        <Input id="whatsappNumber" placeholder="5551999998888" {...register('whatsappNumber')} />
        {errors.whatsappNumber && <p className="text-sm text-danger">{errors.whatsappNumber.message}</p>}
      </div>

      <fieldset className="space-y-2 rounded-lg bg-canvas p-3">
        <legend className="text-sm font-body mb-1 px-1">Canais</legend>
        <p className="text-sm font-body text-muted px-1 pb-1">
          Como o cliente pode pedir nesta loja. O que estiver desmarcado não aparece no cardápio.
        </p>
        <label className="flex items-center gap-2 font-body">
          <Controller
            control={control}
            name="supportsDineIn"
            render={({ field }) => <Checkbox checked={field.value} onCheckedChange={field.onChange} />}
          />
          Cafeteria
        </label>
        <label className="flex items-center gap-2 font-body">
          <Controller
            control={control}
            name="supportsPickup"
            render={({ field }) => <Checkbox checked={field.value} onCheckedChange={field.onChange} />}
          />
          Retirar no local
        </label>
        <label className="flex items-center gap-2 font-body">
          <Controller
            control={control}
            name="supportsDelivery"
            render={({ field }) => <Checkbox checked={field.value} onCheckedChange={field.onChange} />}
          />
          Delivery
        </label>
        <label className="flex items-center gap-2 font-body">
          <Controller
            control={control}
            name="resellerEnabled"
            render={({ field }) => <Checkbox checked={field.value} onCheckedChange={field.onChange} />}
          />
          Revendedores
        </label>
      </fieldset>

      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Salvando...' : 'Salvar'}
      </Button>
    </form>

    {slug && supportsDineIn && (
      <div className={`${cardClass} space-y-5`}>
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-tile text-lover">
            <QrCode className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-display font-semibold">QR Code de mesa</h3>
            <p className="text-sm font-body text-muted">
              Um QR Code por mesa, já com o número da mesa, para imprimir e colar. O cliente escaneia e
              todo pedido feito ali entra na mesma comanda enquanto ela estiver aberta.
            </p>
          </div>
        </div>

        <div className="grid gap-5 rounded-xl border border-line bg-canvas p-5 sm:grid-cols-[1fr_auto] sm:items-center">
          <div>
            <div className="flex flex-wrap items-end gap-3">
              <div className="space-y-1">
                <Label htmlFor="tableFrom">Da mesa</Label>
                <Input
                  id="tableFrom"
                  type="number"
                  min={1}
                  className="w-20"
                  value={tableFrom}
                  onChange={(event) => setTableFrom(event.target.value)}
                />
              </div>
              <span className="pb-2 text-sm text-faint">até</span>
              <div className="space-y-1">
                <Label htmlFor="tableTo">Até a mesa</Label>
                <Input
                  id="tableTo"
                  type="number"
                  min={1}
                  className="w-20"
                  value={tableTo}
                  onChange={(event) => setTableTo(event.target.value)}
                />
              </div>
            </div>

            <p
              className={`mt-3 flex items-center gap-1.5 text-sm font-medium ${
                tableCount > 0 && tableCount <= 100 ? 'text-lover' : 'text-danger'
              }`}
            >
              {tableCount > 0 && tableCount <= 100 && <Check className="h-3.5 w-3.5 shrink-0" />}
              {tableCount === 0
                ? '"Da mesa" precisa ser menor ou igual a "Até a mesa"'
                : tableCount > 100
                  ? `São ${tableCount} mesas. Dá para gerar até 100 por vez`
                  : `Gera ${tableCount} QR Code${tableCount === 1 ? '' : 's'} (mesa ${tableFrom} até ${tableTo})`}
            </p>

            <Button
              type="button"
              onClick={handleGenerateQrCodes}
              disabled={isGeneratingQr || tableCount === 0 || tableCount > 100}
              className="mt-4 gap-2"
            >
              <Printer className="h-4 w-4" />
              {isGeneratingQr ? 'Gerando...' : 'Gerar e imprimir'}
            </Button>
          </div>

          {qrPreviewUrl && (
            <div className="flex flex-col items-center">
              <img
                src={qrPreviewUrl}
                alt={`QR Code da mesa ${tableFrom}`}
                className="h-24 w-24 rounded-lg border border-line bg-white p-1.5"
              />
              <p className="mt-1.5 text-xs text-muted">Mesa {tableFrom}</p>
            </div>
          )}
        </div>
      </div>
    )}
  </>
  )
}
