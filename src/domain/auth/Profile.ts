export type Role = 'super_admin' | 'store_admin' | 'customer'

export interface Profile {
  id: string
  role: Role
  storeId: string | null
  fullName: string | null
  active: boolean
}
