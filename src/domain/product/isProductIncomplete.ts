import type { Product } from './Product'

export function isProductIncomplete(product: Product): boolean {
  return !product.category || !product.imageUrl
}
