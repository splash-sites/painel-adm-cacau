import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Pencil, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { useEffectiveStoreId } from '../storeContext/useEffectiveStoreId'
import type { Category } from '../../domain/category/Category'
import { Button } from '../ui/Button'
import { ConfirmModal } from '../ui/ConfirmModal'
import { cardClass, tableCardClass, tableHeaderCellClass, tableRowClass } from '../ui/styles'
import { CategoryModal } from './CategoryModal'
import { useCategoryList, useDeleteCategory } from './useCategories'

export function CategoryListPage() {
  const storeId = useEffectiveStoreId()
  const navigate = useNavigate()
  const { data: categories, isLoading, error } = useCategoryList(storeId ?? '')
  const deleteCategory = useDeleteCategory()
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

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl md:text-3xl text-accent">Categorias</h2>
          <p className="font-body text-sm text-foreground/60">
            Como os produtos aparecem agrupados no cardápio — vincule cada um dentro do cadastro do produto.
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
        <div className={tableCardClass}>
          <table className="w-full text-left font-body">
            <thead>
              <tr className="h-11">
                <th className={`${tableHeaderCellClass} pl-6`}>Nome</th>
                <th className={`${tableHeaderCellClass} pr-6`}></th>
              </tr>
            </thead>
            <tbody>
              {categories.map((category) => (
                <tr key={category.id} className={tableRowClass}>
                  <td className="py-3 pl-6">
                    <span className={category.active ? '' : 'text-foreground/40 line-through'}>
                      {category.name}
                    </span>
                  </td>
                  <td className="py-3 pr-6 text-right">
                    <div className="flex items-center justify-end gap-1">
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
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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
