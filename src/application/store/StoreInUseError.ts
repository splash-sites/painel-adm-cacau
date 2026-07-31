export class StoreInUseError extends Error {
  constructor() {
    super('Loja já tem produto, pedido ou usuário vinculado — desative em vez de excluir')
    this.name = 'StoreInUseError'
  }
}
