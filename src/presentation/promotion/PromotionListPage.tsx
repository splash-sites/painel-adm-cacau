import { useState } from 'react'
import { GripVertical, Pencil, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { useEffectiveStoreId } from '../storeContext/useEffectiveStoreId'
import type { Promotion } from '../../domain/promotion/Promotion'
import { Button } from '../ui/Button'
import { ConfirmModal } from '../ui/ConfirmModal'
import { SortableItem, SortableList } from '../ui/SortableList'
import { cardClass, tableCardClass } from '../ui/styles'
import { PromotionModal } from './PromotionModal'
import { useDeletePromotion, usePromotionList, useReorderPromotions } from './usePromotions'

export function PromotionListPage() {
  const storeId = useEffectiveStoreId()
  const { data: promotions, isLoading, error } = usePromotionList(storeId)
  const deletePromotion = useDeletePromotion()
  const reorderPromotions = useReorderPromotions()
  const [editingPromotion, setEditingPromotion] = useState<Promotion | null>(null)
  const [deletingPromotion, setDeletingPromotion] = useState<Promotion | null>(null)
  const [isCreating, setIsCreating] = useState(false)

  async function handleDelete() {
    if (!deletingPromotion) return
    try {
      await deletePromotion.mutateAsync(deletingPromotion.id)
      toast.success('Promoção excluída.')
      setDeletingPromotion(null)
    } catch (deleteError) {
      toast.error(deleteError instanceof Error ? deleteError.message : 'Falha ao excluir promoção')
    }
  }

  function handleReorder(nextIds: string[]) {
    reorderPromotions.mutate(
      { storeId, orderedIds: nextIds },
      {
        onError: (reorderError) =>
          toast.error(reorderError instanceof Error ? reorderError.message : 'Falha ao reordenar promoções'),
      },
    )
  }

  const promotionIds = promotions?.map((promotion) => promotion.id) ?? []

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl md:text-3xl text-accent">Promoções</h2>
          <p className="font-body text-sm text-foreground/60">
            Carrossel de promoções do cardápio — arraste pra mudar a ordem de exibição.
          </p>
        </div>
        {storeId && <Button onClick={() => setIsCreating(true)}>Nova promoção</Button>}
      </div>

      {!storeId && <p className="font-body">Selecione uma loja pra ver as promoções.</p>}
      {isLoading && <p className="font-body">Carregando...</p>}
      {error && <p className="font-body text-red-600">Erro ao carregar promoções</p>}

      {promotions && promotions.length === 0 && (
        <div className={cardClass}>
          <p className="font-body text-foreground/70">Nenhuma promoção cadastrada ainda.</p>
        </div>
      )}

      {promotions && promotions.length > 0 && (
        <div className={`${tableCardClass} p-2`}>
          <SortableList ids={promotionIds} onReorder={handleReorder}>
            <div className="space-y-1">
              {promotions.map((promotion) => (
                <SortableItem key={promotion.id} id={promotion.id}>
                  {({ setActivatorNodeRef, attributes, listeners }) => (
                    <div className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-secondary/5">
                      <button
                        type="button"
                        ref={setActivatorNodeRef}
                        {...attributes}
                        {...listeners}
                        aria-label={`Arrastar ${promotion.title}`}
                        className="cursor-grab touch-none rounded-md p-1 text-foreground/40 hover:bg-secondary/10 hover:text-foreground active:cursor-grabbing"
                      >
                        <GripVertical className="h-4 w-4" />
                      </button>
                      <img src={promotion.imageUrl} alt="" className="h-12 w-12 shrink-0 rounded-md object-cover" />
                      <div className="min-w-0 flex-1 font-body">
                        <p
                          className={
                            promotion.active ? 'font-medium truncate' : 'truncate font-medium text-foreground/40 line-through'
                          }
                        >
                          {promotion.title}
                        </p>
                        <p className="truncate text-xs text-foreground/50">
                          {promotion.productName}
                          {promotion.badgeLabel && ` · ${promotion.badgeLabel}`}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-1">
                        <button
                          type="button"
                          aria-label={`Editar ${promotion.title}`}
                          onClick={() => setEditingPromotion(promotion)}
                          className="rounded-md p-1.5 text-foreground/50 hover:bg-secondary/10 hover:text-foreground"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          aria-label={`Excluir ${promotion.title}`}
                          onClick={() => setDeletingPromotion(promotion)}
                          className="rounded-md p-1.5 text-foreground/50 hover:bg-red-700/10 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  )}
                </SortableItem>
              ))}
            </div>
          </SortableList>
        </div>
      )}

      {deletingPromotion && (
        <ConfirmModal
          title="Excluir promoção"
          description={`Excluir "${deletingPromotion.title}"? Essa ação não pode ser desfeita.`}
          confirmLabel="Confirmar exclusão"
          pendingLabel="Excluindo..."
          confirmVariant="danger"
          isPending={deletePromotion.isPending}
          onClose={() => setDeletingPromotion(null)}
          onConfirm={handleDelete}
        />
      )}

      {editingPromotion && storeId && (
        <PromotionModal
          key={editingPromotion.id}
          storeId={storeId}
          promotion={editingPromotion}
          onClose={() => setEditingPromotion(null)}
        />
      )}

      {isCreating && storeId && <PromotionModal storeId={storeId} onClose={() => setIsCreating(false)} />}
    </div>
  )
}
