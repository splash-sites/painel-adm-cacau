import { useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { storeSchema, type StoreFormInput } from '../../application/store/storeSchema'
import type { Store } from '../../domain/store/Store'
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
import { DEFAULT_NOTIFICATION_PREFS, useNotificationSettings } from './useNotificationSettings'

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
      <h2 className="font-display text-2xl md:text-3xl text-accent">Configurações</h2>

      {!storeId && (
        <div className={cardClass}>
          <p className="font-body text-foreground/70">Selecione uma loja pra ver as configurações dela.</p>
        </div>
      )}

      {store && <StoreDataForm key={store.id} store={store} />}

      <div className={`${cardClass} space-y-4`}>
        <div>
          <h3 className="font-body font-medium">Alerta de pedido novo</h3>
          <p className="text-sm font-body text-foreground/60">
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
            <p className="text-sm font-body text-foreground/60">
              {permission === 'denied'
                ? 'Bloqueada nas configurações do navegador — precisa liberar por lá antes de ativar aqui.'
                : permission === 'default'
                  ? 'O navegador ainda não deu permissão — ligar o botão ao lado abre o pedido de permissão.'
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
          <h3 className="font-body font-medium text-red-700">Zona de risco</h3>
          <p className="text-sm font-body text-foreground/60">
            Desativar fecha a loja (para de aceitar pedido) sem apagar nada. Excluir remove a loja
            permanentemente — só funciona se não tiver produto, pedido ou usuário vinculado.
          </p>
          {deleteError && <p className="text-sm text-red-600">{deleteError}</p>}
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
    <form onSubmit={handleSubmit(onSubmitStore)} className={`space-y-5 ${cardClass}`} noValidate>
      <div>
        <h3 className="font-body font-medium">Dados da loja</h3>
        <p className="text-sm font-body text-foreground/60">Nome e link do cardápio que o cliente vê.</p>
      </div>

      <div className="space-y-1">
        <Label htmlFor="name">Nome da unidade</Label>
        <Input id="name" {...register('name')} />
        {errors.name && <p className="text-sm text-red-600">{errors.name.message}</p>}
      </div>

      <div className="space-y-1">
        <Label htmlFor="slug">Slug</Label>
        <p className="text-sm font-body text-foreground/60">
          Parte do endereço do cardápio (sem espaço, sem acento): cardapio.splashpedidos/
          <span className="font-medium">seu-slug</span>
        </p>
        <Input id="slug" {...register('slug')} />
        {errors.slug && <p className="text-sm text-red-600">{errors.slug.message}</p>}
        {slug && (
          <a
            href={`${import.meta.env.VITE_STOREFRONT_URL}/${slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block text-sm text-secondary hover:text-primary transition-colors"
          >
            Ver cardápio →
          </a>
        )}
      </div>

      <div className="space-y-1">
        <Label htmlFor="whatsappNumber">WhatsApp</Label>
        <p className="text-sm font-body text-foreground/60">
          Só números, com DDI e DDD (ex: 5551999998888) — usado no link do WhatsApp com o cliente.
        </p>
        <Input id="whatsappNumber" placeholder="5551999998888" {...register('whatsappNumber')} />
        {errors.whatsappNumber && <p className="text-sm text-red-600">{errors.whatsappNumber.message}</p>}
      </div>

      <fieldset className="space-y-2 rounded-lg bg-secondary/5 p-3">
        <legend className="text-sm font-body mb-1 px-1">Canais</legend>
        <p className="text-sm font-body text-foreground/60 px-1 pb-1">
          Onde essa loja recebe pedido — desmarcado some da tela de novo pedido nesse canal.
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
  )
}
