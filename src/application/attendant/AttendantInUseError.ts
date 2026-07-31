export class AttendantInUseError extends Error {
  constructor() {
    super('Atendente já tem pedido vinculado — desative em vez de excluir')
    this.name = 'AttendantInUseError'
  }
}
