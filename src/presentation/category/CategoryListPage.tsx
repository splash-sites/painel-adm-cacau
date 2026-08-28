import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, GripVertical, Pencil, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { useEffectiveStoreId } from '../storeContext/useEffectiveStoreId'
import type { Category } from '../../domain/category/Category'
import { Button } from '../ui/Button'
import { ConfirmModal } from '../ui/ConfirmModal'
import { SortableItem, SortableList } from '../ui/SortableList'
import { cardClass, tableCardClass } from '../ui/styles'
import { CategoryModal } from './CategoryModal'
import { useCategoryList, useDeleteCategory, useReorderCategories } from './useCategories'

export function CategoryListPage() {
  const storeId = useEffectiveStoreId()
  const navigate = useNavigate()
  const { data: categories, isLoading, error } = useCategoryList(storeId ?? '')
  const deleteCategory = useDeleteCategory()
  const reorderCategories = useReorderCategories()
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [deletingCategory, setDeletingCategory] = useState<Category | null>(null)
  const [isCreating, setIsCreating] = useState(false)

  async function handleDelete() {
    if (!deletingCategory) return
    try {
      await deleteCategory.mutateAsync(deletingCategory.id)
      toast.success('Categoria excluída.')
      setDeletingCategory(null)
    } catch (deleteError) {
      toast.error(deleteError instanceof Error ? deleteError.message : 'Falha ao excluir categoria')
    }
  }

  function handleReorder(nextIds: string[]) {
    if (!storeId) return
    reorderCategories.mutate(
      { storeId, orderedIds: nextIds },
      {
        onError: (reorderError) =>
          toast.error(
            reorderError instanceof Error ? reorderError.message : 'Falha ao reordenar categorias',
          ),
      },
    )
  }

  const categoryIds = categories?.map((category) => category.id) ?? []

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl md:text-3xl text-accent">Categorias</h2>
          <p className="font-body text-sm text-foreground/60">
            Ordem em que os grupos de produtos aparecem no cardápio — arraste pra reordenar. Vincule
            cada produto a uma categoria dentro do cadastro do produto.
          </p>
        </div>
        {storeId && (
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => navigate('/produtos')}>
              <ArrowLeft className="h-4 w-4" />
              Produtos
            </Button>
            <Button onClick={() => setIsCreating(true)} className="gap-1.5">
              <Plus className="h-4 w-4" />
              Nova categoria
            </Button>
          </div>
        )}
      </div>

      {!storeId && <p className="font-body">Selecione uma loja pra ver as categorias.</p>}
      {isLoading && <p className="font-body">Carregando...</p>}
      {error && <p className="font-body text-red-600">Erro ao carregar categorias</p>}

      {categories && categories.length === 0 && (
        <div className={cardClass}>
          <p className="font-body text-foreground/70">Nenhuma categoria cadastrada ainda.</p>
        </div>
      )}

      {categories && categories.length > 0 && (
        <div className={`${tableCardClass} p-2`}>
          <SortableList ids={categoryIds} onReorder={handleReorder}>
            <div className="space-y-1">
              {categories.map((category) => (
                <SortableItem key={category.id} id={category.id}>
                  {({ setActivatorNodeRef, attributes, listeners }) => (
                    <div className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-secondary/5">
                      <button
                        type="button"
                        ref={setActivatorNodeRef}
                        {...attributes}
                        {...listeners}
                        aria-label={`Arrastar ${category.name}`}
                        className="cursor-grab touch-none rounded-md p-1 text-foreground/40 hover:bg-secondary/10 hover:text-foreground active:cursor-grabbing"
                      >
                        <GripVertical className="h-4 w-4" />
                      </button>
                      <span
                        className={`min-w-0 flex-1 truncate font-body ${
                          category.active ? '' : 'text-foreground/40 line-through'
                        }`}
                      >
                        {category.name}
                      </span>
                      <div className="flex shrink-0 items-center gap-1">
                        <button
                          type="button"
                          aria-label={`Editar ${category.name}`}
                          onClick={() => setEditingCategory(category)}
                          className="rounded-md p-1.5 text-foreground/50 hover:bg-secondary/10 hover:text-foreground"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          aria-label={`Excluir ${category.name}`}
                          onClick={() => setDeletingCategory(category)}
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

      {deletingCategory && (
        <ConfirmModal
          title="Excluir categoria"
          description={`Excluir "${deletingCategory.name}"? Essa ação não pode ser desfeita.`}
          confirmLabel="Confirmar exclusão"
          pendingLabel="Excluindo..."
          confirmVariant="danger"
          isPending={deleteCategory.isPending}
          onClose={() => setDeletingCategory(null)}
          onConfirm={handleDelete}
        />
      )}

      {editingCategory && storeId && (
        <CategoryModal
          key={editingCategory.id}
          storeId={storeId}
          category={editingCategory}
          onClose={() => setEditingCategory(null)}
        />
      )}

      {isCreating && storeId && <CategoryModal storeId={storeId} onClose={() => setIsCreating(false)} />}
    </div>
  )
}
