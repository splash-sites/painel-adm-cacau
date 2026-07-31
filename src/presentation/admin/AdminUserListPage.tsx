import { useState } from 'react'
import { Pencil, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from '../auth/useAuth'
import { useEffectiveStoreId } from '../storeContext/useEffectiveStoreId'
import { useAllStores } from '../store/useStores'
import { Button } from '../ui/Button'
import { ConfirmModal } from '../ui/ConfirmModal'
import { initials } from '../ui/initials'
import { cardClass, tableCardClass, tableHeaderCellClass, tableRowClass } from '../ui/styles'
import { CreateAdminModal } from './CreateAdminModal'
import { EditAdminProfileModal } from './EditAdminProfileModal'
import { useAdminUserList, useDeleteAdminUser } from './useAdminUsers'
import type { AdminUser } from '../../application/admin/AdminUserRepository'

const ROLE_LABEL = {
  super_admin: 'Administrador',
  store_admin: 'Colaborador',
} as const

export function AdminUserListPage() {
  const { session } = useAuth()
  const effectiveStoreId = useEffectiveStoreId()
  const { data: allAdmins, isLoading, error } = useAdminUserList()
  const { data: stores } = useAllStores()
  const deleteAdminUser = useDeleteAdminUser()
  const [editingAdmin, setEditingAdmin] = useState<AdminUser | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [deletingAdmin, setDeletingAdmin] = useState<AdminUser | null>(null)

  // Administrador é global (não pertence a loja nenhuma) — aparece independente da loja ativa selecionada.
  // Administrador sempre primeiro na lista, colaborador depois (cada grupo mantém ordem alfabética da query).
  const admins = allAdmins
    ?.filter((admin) => admin.role === 'super_admin' || admin.storeId === effectiveStoreId)
    .sort((a, b) => (a.role === b.role ? 0 : a.role === 'super_admin' ? -1 : 1))

  function storeName(storeId: string | null): string {
    if (!storeId) return '—'
    return stores?.find((store) => store.id === storeId)?.name ?? '—'
  }

  async function handleDelete() {
    if (!deletingAdmin) return
    try {
      await deleteAdminUser.mutateAsync(deletingAdmin.id)
      toast.success('Usuário excluído.')
      setDeletingAdmin(null)
    } catch (deleteError) {
      toast.error(deleteError instanceof Error ? deleteError.message : 'Falha ao excluir usuário')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-2xl md:text-3xl text-accent">Usuários</h2>
        <Button onClick={() => setIsCreating(true)}>Novo usuário</Button>
      </div>

      {isLoading && <p className="font-body">Carregando...</p>}
      {error && <p className="font-body text-red-600">Erro ao carregar usuários</p>}

      {admins && admins.length === 0 && (
        <div className={cardClass}>
          <p className="font-body text-foreground/70">Nenhum usuário cadastrado ainda.</p>
        </div>
      )}

      {admins && admins.length > 0 && (
        <div className={`${tableCardClass} overflow-x-auto`}>
          <table className="w-full table-fixed text-left font-body">
            <colgroup>
              <col className="w-[32%]" />
              <col className="w-[16%]" />
              <col className="w-[20%]" />
              <col className="w-[16%]" />
              <col className="w-[16%]" />
            </colgroup>
            <thead>
              <tr>
                <th className={`${tableHeaderCellClass} pl-6`}>Nome</th>
                <th className={tableHeaderCellClass}>Papel</th>
                <th className={tableHeaderCellClass}>Loja</th>
                <th className={tableHeaderCellClass}>Status</th>
                <th className={`${tableHeaderCellClass} pr-6`}></th>
              </tr>
            </thead>
            <tbody>
              {admins.map((admin) => (
                <tr key={admin.id} className={tableRowClass}>
                  <td className="py-3 pl-6">
                    <div className="flex items-center gap-3">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/20 text-xs font-semibold text-accent">
                        {initials(admin.fullName)}
                      </span>
                      <span className="truncate">{admin.fullName ?? '—'}</span>
                    </div>
                  </td>
                  <td className="py-3 truncate">{ROLE_LABEL[admin.role]}</td>
                  <td className="py-3 truncate">{storeName(admin.storeId)}</td>
                  <td className="py-3">
                    {admin.active ? (
                      <span className="inline-block w-24 rounded-full bg-green-700 text-white text-xs px-2.5 py-1 text-center">
                        Ativo
                      </span>
                    ) : (
                      <span className="inline-block w-24 rounded-full bg-red-700 text-white text-xs px-2.5 py-1 text-center">
                        Desativado
                      </span>
                    )}
                  </td>
                  <td className="py-3 pr-6 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        type="button"
                        aria-label={`Editar ${admin.fullName ?? 'usuário'}`}
                        onClick={() => setEditingAdmin(admin)}
                        className="rounded-md p-1.5 text-foreground/50 hover:bg-secondary/10 hover:text-foreground"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      {admin.id !== session?.profile.id && (
                        <button
                          type="button"
                          aria-label={`Excluir ${admin.fullName ?? 'usuário'}`}
                          onClick={() => setDeletingAdmin(admin)}
                          className="rounded-md p-1.5 text-foreground/50 hover:bg-red-700/10 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editingAdmin && (
        <EditAdminProfileModal admin={editingAdmin} onClose={() => setEditingAdmin(null)} />
      )}

      {isCreating && <CreateAdminModal onClose={() => setIsCreating(false)} />}

      {deletingAdmin && (
        <ConfirmModal
          title="Excluir usuário"
          description={`Excluir "${deletingAdmin.fullName ?? 'usuário'}"? Essa ação não pode ser desfeita. Só funciona se não tiver pedido vinculado — nesse caso, desative em vez de excluir.`}
          confirmLabel="Confirmar exclusão"
          pendingLabel="Excluindo..."
          confirmVariant="danger"
          isPending={deleteAdminUser.isPending}
          onClose={() => setDeletingAdmin(null)}
          onConfirm={handleDelete}
        />
      )}
    </div>
  )
}
