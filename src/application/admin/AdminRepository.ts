export interface CreateAdminPayload {
  fullName: string
  email: string
  password: string
  role: 'super_admin' | 'store_admin'
  storeId?: string
}

export interface SetupFirstAdminPayload {
  fullName: string
  email: string
  password: string
}

export interface AdminRepository {
  createAdmin(payload: CreateAdminPayload): Promise<void>
  setupFirstAdmin(payload: SetupFirstAdminPayload): Promise<void>
}
