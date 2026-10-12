import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { storeSchema, type StoreFormInput } from '../../application/store/storeSchema'
import type { Store } from '../../domain/store/Store'
import { useSaveStore } from '../store/useStores'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { Label } from '../ui/Label'
import { maskWhatsapp } from '../../domain/store/whatsappMask'

/** Seção "Loja" de Configurações: nome, endereço do cardápio e WhatsApp. */
export function StoreDataForm({ store }: { store: Store }) {
  const saveStore = useSaveStore()
  const defaultValues = { ...store, whatsappNumber: maskWhatsapp(store.whatsappNumber ?? '') }
  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<StoreFormInput>({ resolver: zodResolver(storeSchema), defaultValues })
  const slug = watch('slug')
  const { onChange: onWhatsappChange, ...whatsappField } = register('whatsappNumber')
  const storefrontUrl = import.meta.env.VITE_STOREFRONT_URL

  async function onSubmit(input: StoreFormInput) {
    try {
      const whatsappNumber = input.whatsappNumber ? input.whatsappNumber.replace(/\D/g, '') || null : null
      await saveStore.mutateAsync({ id: store.id, input: { ...input, whatsappNumber } })
      reset({ ...input, whatsappNumber: maskWhatsapp(whatsappNumber ?? '') })
      toast.success('Dados da loja salvos.')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível salvar a loja.')
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-1 flex-col gap-5" noValidate>
      <div className="flex max-w-xl flex-col gap-1.5">
        <Label htmlFor="store-name">Nome da unidade</Label>
        <Input id="store-name" {...register('name')} />
        {errors.name && <p className="text-sm text-danger">{errors.name.message}</p>}
      </div>
      <div className="flex max-w-xl flex-col gap-1.5">
        <Label htmlFor="store-slug">Endereço do cardápio</Label>
        <Input id="store-slug" {...register('slug')} />
        <p className="text-[13px] text-muted">
          Só minúsculas, números e hífen. Fica no fim do link: …/<b className="font-semibold text-ink">{slug || 'sua-loja'}</b>
        </p>
        {errors.slug && <p className="text-sm text-danger">{errors.slug.message}</p>}
        {storefrontUrl && slug && !errors.slug && (
          <a
            href={`${storefrontUrl}/${slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="w-fit text-sm font-semibold text-lover hover:underline"
          >
            Abrir o cardápio
          </a>
        )}
      </div>
      <div className="flex max-w-xl flex-col gap-1.5">
        <Label htmlFor="store-whatsapp">WhatsApp da loja</Label>
        <Input
          id="store-whatsapp"
          inputMode="tel"
          placeholder="+55 (51) 99999-9999"
          {...whatsappField}
          onChange={(event) => {
            event.target.value = maskWhatsapp(event.target.value)
            onWhatsappChange(event)
          }}
        />
        <p className="text-[13px] text-muted">Com DDI e DDD. É o número que o cliente chama nos pedidos de entrega.</p>
        {errors.whatsappNumber && <p className="text-sm text-danger">{errors.whatsappNumber.message}</p>}
      </div>
      <div className="mt-auto flex justify-end gap-2 border-t border-line pt-4">
        <Button variant="outline" onClick={() => reset(defaultValues)} disabled={!isDirty || isSubmitting}>
          Descartar
        </Button>
        <Button type="submit" disabled={!isDirty || isSubmitting}>
          {isSubmitting ? 'Salvando...' : 'Salvar'}
        </Button>
      </div>
    </form>
  )
}
