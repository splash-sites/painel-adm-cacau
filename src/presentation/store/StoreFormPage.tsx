import { useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useNavigate } from 'react-router-dom'
import { createStoreSchema, type CreateStoreFormInput } from '../../application/store/storeSchema'
import { useActiveStore } from '../storeContext/useActiveStore'
import { Button } from '../ui/Button'
import { Checkbox } from '../ui/Checkbox'
import { Input } from '../ui/Input'
import { Label } from '../ui/Label'
import { cardClass } from '../ui/styles'
import { useSaveStore } from './useStores'

const emptyDefaults: CreateStoreFormInput = {
  name: '',
  slug: '',
  active: true,
  supportsDineIn: true,
  supportsPickup: true,
  supportsDelivery: false,
  resellerEnabled: false,
  whatsappNumber: '',
}

export function StoreFormPage() {
  const navigate = useNavigate()
  const saveStore = useSaveStore()
  const setActiveStoreId = useActiveStore((state) => state.setActiveStoreId)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<CreateStoreFormInput>({ resolver: zodResolver(createStoreSchema), defaultValues: emptyDefaults })

  async function onSubmit(input: CreateStoreFormInput) {
    setSubmitError(null)
    try {
      const savedStore = await saveStore.mutateAsync({
        input: { ...input, whatsappNumber: input.whatsappNumber.replace(/\D/g, '') },
      })
      setActiveStoreId(savedStore.id)
      navigate('/')
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Falha ao salvar loja')
    }
  }

  return (
    <div className="max-w-lg space-y-6">
      <h2 className="font-display text-2xl md:text-3xl text-accent">Nova loja</h2>

      <form onSubmit={handleSubmit(onSubmit)} className={`space-y-5 ${cardClass}`} noValidate>
        <div className="space-y-1">
          <Label htmlFor="name">Nome</Label>
          <Input id="name" {...register('name')} />
          {errors.name && <p className="text-sm text-red-600">{errors.name.message}</p>}
        </div>

        <div className="space-y-1">
          <Label htmlFor="slug">Slug</Label>
          <Input id="slug" {...register('slug')} />
          {errors.slug && <p className="text-sm text-red-600">{errors.slug.message}</p>}
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
          <label className="flex items-center gap-2 font-body">
            <Controller
              control={control}
              name="active"
              render={({ field }) => <Checkbox checked={field.value} onCheckedChange={field.onChange} />}
            />
            Loja ativa
          </label>
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

        {submitError && <p className="text-sm text-red-600">{submitError}</p>}

        <div className="flex gap-3 pt-2">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Salvando...' : 'Salvar'}
          </Button>
          <Button type="button" variant="outline" onClick={() => navigate('/')}>
            Cancelar
          </Button>
        </div>
      </form>
    </div>
  )
}
