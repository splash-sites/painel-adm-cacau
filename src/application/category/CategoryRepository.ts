import type { Category } from '../../domain/category/Category'

export interface CategoryInput {
  name: string
  active: boolean
}

export interface CategoryRepository {
  list(storeId: string): Promise<Category[]>
  create(storeId: string, input: CategoryInput): Promise<Category>
  update(id: string, input: CategoryInput): Promise<void>
  delete(id: string): Promise<void>
}
