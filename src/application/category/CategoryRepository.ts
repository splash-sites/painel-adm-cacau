import type { Category } from '../../domain/category/Category'

export interface CategoryInput {
  name: string
  active: boolean
}

export interface CategoryRepository {
  /** Ordenado por sort_order (e nome como desempate). */
  list(storeId: string): Promise<Category[]>
  create(storeId: string, input: CategoryInput): Promise<Category>
  update(id: string, input: CategoryInput): Promise<void>
  delete(id: string): Promise<void>
  /** Grava a nova ordem (sort_order = posição na lista) de todas as categorias da loja. */
  reorder(storeId: string, orderedIds: string[]): Promise<void>
}
