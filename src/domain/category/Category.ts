export interface Category {
  id: string
  storeId: string
  name: string
  active: boolean
  /** Ordem de exibição no cardápio (menor primeiro). Definida arrastando na tela de Categorias. */
  sortOrder: number
}
