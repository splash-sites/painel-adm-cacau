import type { Product } from './Product'

export function isProductIncomplete(product: Product): boolean {
  return !product.categoryId || !product.imageUrl
}
