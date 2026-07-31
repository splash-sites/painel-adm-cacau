import { useEffect, useId, useRef, useState } from 'react'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import type { Order, OrderItem } from '../../domain/order/Order'
import type { Product } from '../../domain/product/Product'
import { useProductSearch } from '../product/useProducts'
import { Button } from '../ui/Button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogTitle } from '../ui/Dialog'
import { Input } from '../ui/Input'
import { Label } from '../ui/Label'
import { cardClass } from '../ui/styles'
import { useDebouncedValue } from '../ui/useDebouncedValue'
import { ItemSelectionFields, type ItemSelectionValue } from './ItemSelectionFields'
import { useAddOrderItem, useRemoveOrderItem, useUpdateOrderItem } from './useOrders'

const emptySelection: ItemSelectionValue = { variationOptionIds: [], addons: [] }

function ProductSearchInput({
  storeId,
  onSelect,
}: {
  storeId: string
  onSelect: (product: Product) => void
}) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const debouncedQuery = useDebouncedValue(query, 250)
  const { data: results } = useProductSearch(storeId, debouncedQuery)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const filtered = results ?? []

  return (
    <div className="relative" ref={containerRef}>
      <Input
        type="text"
        value={query}
        onChange={(event) => {
          setQuery(event.target.value)
          setOpen(true)
        }}
        onFocus={() => setOpen(true)}
        placeholder="Buscar produto..."
      />
      {open && filtered.length > 0 && (
        <div className="absolute left-0 right-0 top-full z-10 mt-1 max-h-48 overflow-y-auto rounded-lg border border-secondary/25 bg-background shadow-lg">
          {filtered.map((product) => (
            <button
              key={product.id}
              type="button"
              onClick={() => {
                onSelect(product)
                setQuery(product.name)
                setOpen(false)
              }}
              className="block w-full truncate px-3 py-2 text-left text-sm font-body hover:bg-secondary/5"
            >
              {product.name}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function ExistingItemCard({
  storeId,
  item,
  isEditing,
  onToggleEdit,
  onRemove,
  isRemoving,
  canRemove,
}: {
  storeId: string
  item: OrderItem
  isEditing: boolean
  onToggleEdit: () => void
  onRemove: () => void
  isRemoving: boolean
  canRemove: boolean
}) {
  const updateItem = useUpdateOrderItem()
  const [quantity, setQuantity] = useState(item.quantity)
  const [selection, setSelection] = useState<ItemSelectionValue>(emptySelection)
  const [selectionValid, setSelectionValid] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const quantityId = useId()

  const initialVariationOptionIds = item.variations
    .map((variation) => variation.variationOptionId)
    .filter((id): id is string => id != null)
  const initialAddons = item.addons
    .filter((addon): addon is typeof addon & { addonOptionId: string } => addon.addonOptionId != null)
    .map((addon) => ({ addonOptionId: addon.addonOptionId, quantity: addon.quantity }))

  async function handleSave() {
    if (quantity < 1) return
    setError(null)
    try {
      await updateItem.mutateAsync({ itemId: item.id, quantity, selection })
      onToggleEdit()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao salvar item')
    }
  }

  async function handleQuantityBlur(newQuantity: number) {
    if (isEditing || newQuantity < 1 || newQuantity === item.quantity) return
    setError(null)
    try {
      await updateItem.mutateAsync({
        itemId: item.id,
        quantity: newQuantity,
        selection: { variationOptionIds: initialVariationOptionIds, addons: initialAddons },
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao atualizar quantidade')
    }
  }

  return (
    <div className={`${cardClass} space-y-3 p-4`}>
      <div className="flex items-center justify-between gap-3">
        <span className="font-body font-medium">{item.productName}</span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onToggleEdit}
            aria-label="Editar seleção do item"
            className="rounded-md p-1.5 text-foreground/50 hover:bg-secondary/10 hover:text-foreground"
          >
            <Pencil className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={onRemove}
            disabled={isRemoving || !canRemove}
            aria-label={`Remover ${item.productName}`}
            title={canRemove ? undefined : 'Pedido precisa ter pelo menos 1 item'}
            className="rounded-md p-1.5 text-foreground/50 hover:bg-red-700/10 hover:text-red-700 disabled:opacity-50 disabled:hover:bg-transparent disabled:hover:text-foreground/50"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="max-w-[8rem] space-y-1">
        <Label htmlFor={quantityId}>Quantidade</Label>
        <Input
          id={quantityId}
          type="number"
          min={1}
          value={quantity}
          onChange={(event) => setQuantity(Number(event.target.value))}
          onBlur={(event) => handleQuantityBlur(Number(event.target.value))}
        />
        {quantity < 1 && <p className="text-sm text-red-600">Quantidade precisa ser maior que zero</p>}
      </div>

      {isEditing && (
        <div className="space-y-3 border-t border-secondary/10 pt-3">
          <ItemSelectionFields
            storeId={storeId}
            productId={item.productId}
            initialVariationOptionIds={initialVariationOptionIds}
            initialAddons={initialAddons}
            onChange={(value, valid) => {
              setSelection(value)
              setSelectionValid(valid)
            }}
          />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onToggleEdit}>
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={handleSave}
              disabled={updateItem.isPending || !selectionValid || quantity < 1}
            >
              {updateItem.isPending ? 'Salvando...' : 'Salvar'}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

export function OrderItemsEditModal({ order, onClose }: { order: Order; onClose: () => void }) {
  const addItem = useAddOrderItem()
  const removeItem = useRemoveOrderItem()
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [quantity, setQuantity] = useState(1)
  const [selection, setSelection] = useState<ItemSelectionValue>(emptySelection)
  const [selectionValid, setSelectionValid] = useState(true)
  const [editingItemId, setEditingItemId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const newQuantityId = useId()

  async function handleAdd() {
    if (!selectedProduct || quantity < 1 || !selectionValid) return
    setError(null)
    try {
      await addItem.mutateAsync({ orderId: order.id, productId: selectedProduct.id, quantity, selection })
      setSelectedProduct(null)
      setQuantity(1)
      setSelection(emptySelection)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao adicionar item')
    }
  }

  async function handleRemove(itemId: string) {
    setError(null)
    try {
      await removeItem.mutateAsync(itemId)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao remover item')
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[85vh] max-w-xl overflow-y-auto scrollbar-hidden">
        <DialogTitle>Editar itens do pedido</DialogTitle>
        <DialogDescription>Troque quantidade, variação e adicional, ou adicione um item novo.</DialogDescription>

        <div className="space-y-3">
          {order.items.map((item) => (
            <ExistingItemCard
              key={item.id}
              storeId={order.storeId}
              item={item}
              isEditing={editingItemId === item.id}
              onToggleEdit={() => setEditingItemId(editingItemId === item.id ? null : item.id)}
              onRemove={() => handleRemove(item.id)}
              isRemoving={removeItem.isPending}
              canRemove={order.items.length > 1}
            />
          ))}
          {order.items.length === 0 && (
            <p className="font-body text-sm text-foreground/50">Nenhum item nesse pedido.</p>
          )}
        </div>

        <fieldset className={`${cardClass} space-y-3 bg-secondary/5 p-4`}>
          <legend className="px-1 font-body text-sm font-medium">Adicionar item</legend>

          <div className="space-y-1">
            <Label>Produto</Label>
            <ProductSearchInput
              storeId={order.storeId}
              onSelect={(product) => {
                setSelectedProduct(product)
                setSelection(emptySelection)
              }}
            />
          </div>

          <div className="max-w-[8rem] space-y-1">
            <Label htmlFor={newQuantityId}>Quantidade</Label>
            <Input
              id={newQuantityId}
              type="number"
              min={1}
              value={quantity}
              onChange={(event) => setQuantity(Number(event.target.value))}
            />
          </div>

          {selectedProduct && (
            <ItemSelectionFields
              key={selectedProduct.id}
              storeId={order.storeId}
              productId={selectedProduct.id}
              onChange={(value, valid) => {
                setSelection(value)
                setSelectionValid(valid)
              }}
            />
          )}

          <Button
            type="button"
            onClick={handleAdd}
            disabled={addItem.isPending || !selectedProduct || !selectionValid}
            className="w-full gap-1.5"
          >
            <Plus className="h-4 w-4" />
            Adicionar item
          </Button>
        </fieldset>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
