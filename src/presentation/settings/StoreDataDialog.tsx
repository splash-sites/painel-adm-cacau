import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { storeSchema, type StoreFormInput } from '../../application/store/storeSchema'
import type { Store } from '../../domain/store/Store'
import { useSaveStore } from '../store/useStores'
import { Button } from '../ui/Button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogTitle } from '../ui/Dialog'
import { Input } from '../ui/Input'
import { Label } from '../ui/Label'

/** Janela do card "Loja": nome, endereço do cardápio e WhatsApp. Canais e status ficam nos outros cards. */
export function StoreDataDialog({ store, onClose }: { store: Store; onClose: () => void }) {
  const saveStore = useSaveStore()
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<StoreFormInput>({
    resolver: zodResolver(storeSchema),
    defaultValues: { ...store, whatsappNumber: store.whatsappNumber ?? '' },
  })
  const slug = watch('slug')

  async function onSubmit(input: StoreFormInput) {
    try {
      await saveStore.mutateAsync({
        id: store.id,
        input: {
          ...input,
          whatsappNumber: input.whatsappNumber ? input.whatsappNumber.replace(/\D/g, '') || null : null,
        },
      })
      toast.success('Dados da loja salvos.')
      onClose()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível salvar a loja.')
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg">
        <div className="flex flex-col gap-1">
          <DialogTitle>Dados da loja</DialogTitle>
          <DialogDescription>O que o cliente vê no topo do cardápio.</DialogDescription>
        </div>
        <form
          onSubmit={(event) => {
            event.stopPropagation()
            void handleSubmit(onSubmit)(event)
          }}
          className="flex flex-col gap-4"
          noValidate
        >
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="store-name">Nome da unidade</Label>
            <Input id="store-name" {...register('name')} />
            {errors.name && <p className="text-sm text-danger">{errors.name.message}</p>}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="store-slug">Endereço do cardápio</Label>
            <Input id="store-slug" {...register('slug')} />
            <p className="text-[13px] text-muted">
              Só minúsculas, números e hífen. Fica no fim do link: …/<b className="font-semibold text-ink">{slug || 'sua-loja'}</b>
            </p>
            {errors.slug && <p className="text-sm text-danger">{errors.slug.message}</p>}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="store-whatsapp">WhatsApp da loja</Label>
            <Input id="store-whatsapp" inputMode="tel" placeholder="5551999998888" {...register('whatsappNumber')} />
            <p className="text-[13px] text-muted">Com DDI e DDD. É o número que o cliente chama nos pedidos de entrega.</p>
            {errors.whatsappNumber && <p className="text-sm text-danger">{errors.whatsappNumber.message}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={onClose}>
              Voltar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
