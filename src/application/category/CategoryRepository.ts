import type { Category } from '../../domain/category/Category'
import type { MenuChannel } from '../../domain/product/groupByCategory'

export interface CategoryInput {
  name: string
  active: boolean
}

export interface CategoryRepository {
  /** Ordenado por sort_order (Cafeteria) e nome como desempate. */
  list(storeId: string): Promise<Category[]>
  create(storeId: string, input: CategoryInput): Promise<Category>
  update(id: string, input: CategoryInput): Promise<void>
  delete(id: string): Promise<void>
  /** Grava a nova ordem (posição na lista) de todas as categorias da loja, no canal dado. */
  reorder(storeId: string, orderedIds: string[], channel: MenuChannel): Promise<void>
}
