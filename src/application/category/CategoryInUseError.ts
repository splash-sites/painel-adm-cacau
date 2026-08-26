export class CategoryInUseError extends Error {
  constructor() {
    super('Categoria já tem produto vinculado — desative em vez de excluir')
    this.name = 'CategoryInUseError'
  }
}
