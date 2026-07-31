export class ProductInUseError extends Error {
  constructor() {
    super('Produto já foi usado em algum pedido — desative em vez de excluir')
    this.name = 'ProductInUseError'
  }
}
