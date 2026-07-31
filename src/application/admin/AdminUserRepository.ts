export interface AdminUser {
  id: string
  fullName: string | null
  email: string | null
  role: 'super_admin' | 'store_admin'
  storeId: string | null
  active: boolean
}

/** Papel e loja nunca mudam após a criação — só active é editável aqui. */
export interface AdminUserUpdateInput {
  active: boolean
}

export interface AdminUserProfileUpdateInput {
  fullName: string
  email: string
  password?: string
}

export interface AdminUserRepository {
  list(): Promise<AdminUser[]>
  getById(id: string): Promise<AdminUser | null>
  update(id: string, input: AdminUserUpdateInput): Promise<void>
  updateProfile(id: string, input: AdminUserProfileUpdateInput): Promise<void>
  remove(id: string): Promise<void>
}
