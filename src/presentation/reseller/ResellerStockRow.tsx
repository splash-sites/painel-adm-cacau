import { useState, type KeyboardEvent } from 'react'
import { toast } from 'sonner'
import type { Product } from '../../domain/product/Product'
import { Input } from '../ui/Input'
import { Switch } from '../ui/Switch'
import { tableRowClass } from '../ui/styles'
import { useUpdateResellerStock } from '../product/useProducts'

interface ResellerStockRowProps {
  product: Product
}

/**
 * Linha de estoque do revendedor. O controle (liga/desliga) é do canal — independe do "controlar estoque"
 * do cadastro do produto. Ligado: edita o saldo direto na tabela e grava ao sair do campo (ou Enter).
 */
export function ResellerStockRow({ product }: ResellerStockRowProps) {
  const updateStock = useUpdateResellerStock()
  const [value, setValue] = useState(String(product.resellerStockQuantity))

  function reset() {
    setValue(String(product.resellerStockQuantity))
  }

  async function save(trackStock: boolean, quantity: number, successMessage: string) {
    try {
      await updateStock.mutateAsync({ id: product.id, trackStock, quantity })
      toast.success(successMessage)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Falha ao atualizar estoque')
      reset()
    }
  }

  function handleToggle(checked: boolean) {
    void save(
      checked,
      product.resellerStockQuantity,
      checked ? 'Controle de estoque ligado' : 'Controle de estoque desligado',
    )
  }

  function commitQuantity() {
    const quantity = Number(value)
    if (value.trim() === '' || Number.isNaN(quantity) || quantity < 0) {
      toast.error('Estoque não pode ser vazio nem negativo')
      reset()
      return
    }
    if (quantity === product.resellerStockQuantity) return

    void save(product.resellerTrackStock, quantity, 'Estoque atualizado')
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Enter') event.currentTarget.blur()
    if (event.key === 'Escape') {
      reset()
      event.currentTarget.blur()
    }
  }

  return (
    <tr className={tableRowClass}>
      <td className="py-3 pl-6 truncate">{product.externalCode}</td>
      <td className="py-3 truncate">
        <span className="flex items-center gap-2">
          <span className="truncate">{product.name}</span>
          {!product.active && (
            <span className="shrink-0 rounded-full bg-surface-2 px-2 py-0.5 text-xs text-muted">
              Inativo
            </span>
          )}
        </span>
      </td>
      <td className="py-3 truncate">{product.categoryName ?? '—'}</td>
      <td className="py-3">
        <Switch
          checked={product.resellerTrackStock}
          disabled={updateStock.isPending}
          onCheckedChange={handleToggle}
          aria-label={`Controlar estoque de revendedor de ${product.name}`}
        />
      </td>
      <td className="py-3 pr-6">
        {product.resellerTrackStock ? (
          <Input
            type="number"
            min={0}
            step="any"
            value={value}
            disabled={updateStock.isPending}
            aria-label={`Estoque de revendedor de ${product.name}`}
            onChange={(event) => setValue(event.target.value)}
            onBlur={commitQuantity}
            onKeyDown={handleKeyDown}
            className="w-28"
          />
        ) : (
          <span className="text-sm text-muted">Sem controle</span>
        )}
      </td>
    </tr>
  )
}
