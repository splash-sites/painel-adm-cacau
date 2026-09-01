import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { useAllStores } from '../store/useStores'
import { useCopyCatalog } from './useCopyCatalog'
import type { CopyCatalogResult } from '../../application/catalog/CatalogCopyRepository'
import { Button } from '../ui/Button'
import { Checkbox } from '../ui/Checkbox'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogTitle } from '../ui/Dialog'
import { Input } from '../ui/Input'
import { Label } from '../ui/Label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/Select'

type Phase = 'form' | 'preview' | 'done'

export function CopyCatalogModal({
  toStoreId,
  toStoreName,
  onClose,
}: {
  toStoreId: string
  toStoreName: string
  onClose: () => void
}) {
  const { data: stores } = useAllStores()
  const copyCatalog = useCopyCatalog()

  const [phase, setPhase] = useState<Phase>('form')
  const [fromStoreId, setFromStoreId] = useState('')
  const [updateExisting, setUpdateExisting] = useState(false)
  const [password, setPassword] = useState('')
  const [preview, setPreview] = useState<CopyCatalogResult | null>(null)
  const [result, setResult] = useState<CopyCatalogResult | null>(null)

  const originOptions = useMemo(
    () => (stores ?? []).filter((store) => store.id !== toStoreId),
    [stores, toStoreId],
  )

  function requestClose() {
    if (copyCatalog.isPending) return // não fecha no meio da operação
    onClose()
  }

  async function loadPreview() {
    if (!fromStoreId) return
    try {
      const summary = await copyCatalog.mutateAsync({
        fromStoreId,
        toStoreId,
        updateExisting,
        dryRun: true,
      })
      setPreview(summary)
      setPhase('preview')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Falha ao calcular a prévia')
    }
  }

  async function runCopy() {
    if (!password) return
    try {
      const summary = await copyCatalog.mutateAsync({
        fromStoreId,
        toStoreId,
        updateExisting,
        dryRun: false,
        password,
      })
      setResult(summary)
      setPassword('')
      setPhase('done')
      toast.success('Catálogo copiado.')
    } catch (error) {
      setPassword('')
      toast.error(error instanceof Error ? error.message : 'Falha ao copiar catálogo')
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && requestClose()}>
      <DialogContent className="max-w-md">
        <DialogTitle>Copiar catálogo</DialogTitle>
        <DialogDescription>
          Traz produtos, categorias, adicionais, variações e fotos de outra loja para esta.
        </DialogDescription>

        {phase === 'form' && (
          <div className="space-y-4">
            <div className="space-y-1">
              <Label>Para</Label>
              <p className="font-body text-sm text-foreground">
                {toStoreName} <span className="text-foreground/50">(loja atual)</span>
              </p>
            </div>

            <div className="space-y-1">
              <Label>Copiar de</Label>
              <Select value={fromStoreId} onValueChange={setFromStoreId}>
                <SelectTrigger>
                  <SelectValue placeholder="Escolha a loja de origem" />
                </SelectTrigger>
                <SelectContent>
                  {originOptions.map((store) => (
                    <SelectItem key={store.id} value={store.id}>
                      {store.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <label className="flex items-start gap-2 font-body text-sm">
              <Checkbox
                className="mt-0.5"
                checked={updateExisting}
                onCheckedChange={(checked) => setUpdateExisting(checked === true)}
              />
              <span>
                Atualizar produtos que já existem em {toStoreName} com os dados da origem. Desmarcado,
                produtos que já existem são pulados.
              </span>
            </label>

            <p className="rounded-lg border border-secondary/15 bg-secondary/5 p-3 font-body text-xs text-foreground/70">
              Preço, custo e lover são copiados da origem. Estoque no destino entra como “não utiliza
              estoque”. Pedidos não são copiados.
            </p>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={requestClose}>
                Cancelar
              </Button>
              <Button type="button" onClick={loadPreview} disabled={!fromStoreId || copyCatalog.isPending}>
                {copyCatalog.isPending ? 'Calculando...' : 'Ver o que vai mudar'}
              </Button>
            </DialogFooter>
          </div>
        )}

        {phase === 'preview' && preview && (
          <div className="space-y-4">
            <div className="rounded-lg border border-secondary/20 bg-secondary/5 p-4 font-body text-sm">
              <p>{preview.created} produto(s) serão criados</p>
              <p>
                {preview.updated} produto(s) serão {updateExisting ? 'atualizados' : 'pulados'}
              </p>
              {updateExisting && <p>{preview.skipped} produto(s) serão pulados</p>}
              <p className="mt-2">{preview.imageCount} foto(s) serão copiadas</p>
            </div>

            {updateExisting && preview.updated > 0 && (
              <p className="font-body text-sm text-amber-700">
                Atualizar sobrescreve nome, categoria, canais e <strong>preço/custo/lover</strong> desses
                produtos em {toStoreName}. Não tem desfazer.
              </p>
            )}

            <div className="space-y-1">
              <Label htmlFor="copy-catalog-password">Sua senha</Label>
              <Input
                id="copy-catalog-password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setPhase('form')}
                disabled={copyCatalog.isPending}
              >
                Voltar
              </Button>
              <Button
                type="button"
                onClick={runCopy}
                disabled={!password || copyCatalog.isPending}
              >
                {copyCatalog.isPending ? 'Copiando...' : 'Copiar catálogo'}
              </Button>
            </DialogFooter>
          </div>
        )}

        {phase === 'done' && result && (
          <div className="space-y-4">
            <div className="rounded-lg border border-secondary/20 bg-secondary/5 p-4 font-body text-sm">
              <p>{result.created} produto(s) criado(s)</p>
              <p>{result.updated} produto(s) atualizado(s)</p>
              <p>{result.skipped} produto(s) pulado(s) (já existiam)</p>
              <p className="mt-2">
                {result.imagesCopied} foto(s) copiada(s)
                {result.imageErrors > 0 && ` · ${result.imageErrors} falharam`}
              </p>
            </div>
            {result.imageErrors > 0 && (
              <p className="font-body text-sm text-amber-700">
                Algumas fotos não copiaram — rode de novo ou suba manualmente nos produtos afetados.
              </p>
            )}
            <DialogFooter>
              <Button type="button" onClick={onClose}>
                Fechar
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
