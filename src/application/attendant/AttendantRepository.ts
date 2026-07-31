import type { Attendant } from '../../domain/attendant/Attendant'

export interface AttendantInput {
  name: string
  active: boolean
}

export interface AttendantRepository {
  list(storeId: string): Promise<Attendant[]>
  create(storeId: string, input: AttendantInput): Promise<Attendant>
  update(id: string, input: AttendantInput): Promise<void>
  delete(id: string): Promise<void>
}
