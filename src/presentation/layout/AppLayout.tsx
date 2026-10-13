import { useState } from 'react'
import { Menu, X } from 'lucide-react'
import { NavLink, Outlet } from 'react-router-dom'
import { Toaster } from 'sonner'
import { useAuth } from '../auth/useAuth'
import { useOrderNotifications } from '../order/useOrderNotifications'
import { useStore } from '../store/useStores'
import { useEffectiveStoreId } from '../storeContext/useEffectiveStoreId'
import { StoreSwitcher } from './StoreSwitcher'
import { UserMenu } from './UserMenu'

const linkClass = ({ isActive }: { isActive: boolean }) =>
  `block rounded-xl px-3 py-2.5 font-body text-[15px] transition-colors ${
    isActive ? 'bg-ink font-semibold text-white' : 'text-faint hover:bg-surface hover:text-ink'
  }`

export function AppLayout() {
  const { session } = useAuth()
  const isSuperAdmin = session?.profile.role === 'super_admin'
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const storeId = useEffectiveStoreId()
  const { data: store } = useStore(storeId)
  useOrderNotifications(storeId)

  const close = () => setSidebarOpen(false)

  return (
    <div className="min-h-screen bg-canvas text-ink md:flex md:h-screen md:overflow-hidden">
      <div className="flex items-center justify-between border-b border-line bg-surface-2 px-4 py-3 md:hidden">
        <img src="/prestio-logo.svg" alt="Prestio" className="h-7 w-auto" />
        <button
          type="button"
          onClick={() => setSidebarOpen((open) => !open)}
          aria-label={sidebarOpen ? 'Fechar menu' : 'Abrir menu'}
          aria-expanded={sidebarOpen}
          className="flex h-11 w-11 items-center justify-center rounded-xl text-ink hover:bg-surface"
        >
          {sidebarOpen ? <X className="h-5 w-5" aria-hidden="true" /> : <Menu className="h-5 w-5" aria-hidden="true" />}
        </button>
      </div>

      <aside
        className={`${
          sidebarOpen ? 'flex' : 'hidden'
        } md:flex w-full md:w-56 shrink-0 flex-col gap-5 bg-surface-2 px-3.5 py-5 md:h-full md:overflow-y-auto`}
      >
        <div className="hidden border-b border-line-strong px-2 pb-4 md:block">
          <img src="/prestio-logo.svg" alt="Prestio" className="-ml-1 h-10 w-auto" />
        </div>
        <nav aria-label="Menu" className="flex flex-col gap-0.5">
          <NavLink to="/" end className={linkClass} onClick={close}>
            Pedidos
          </NavLink>
          <NavLink to="/historico" className={linkClass} onClick={close}>
            Histórico
          </NavLink>
          <NavLink to="/produtos" className={linkClass} onClick={close}>
            Produtos
          </NavLink>
          <NavLink to="/promocoes" className={linkClass} onClick={close}>
            Promoções
          </NavLink>
          <NavLink to="/atendentes" className={linkClass} onClick={close}>
            Atendentes
          </NavLink>
          {store?.resellerEnabled && (
            <NavLink to="/revendedores" className={linkClass} onClick={close}>
              Revendedores
            </NavLink>
          )}
          {isSuperAdmin && (
            <NavLink to="/relatorios" className={linkClass} onClick={close}>
              Relatórios
            </NavLink>
          )}
          {isSuperAdmin && (
            <NavLink to="/usuarios" className={linkClass} onClick={close}>
              Usuários
            </NavLink>
          )}
          <NavLink to="/configuracoes" end className={linkClass} onClick={close}>
            Configurações
          </NavLink>
        </nav>
        <div className="mt-auto flex flex-col gap-3">
          {isSuperAdmin ? (
            <StoreSwitcher />
          ) : (
            <div className="flex flex-col gap-px rounded-xl bg-surface px-3 py-2.5">
              <span className="text-xs text-faint">Unidade</span>
              <span className="truncate text-sm font-semibold" title={store?.name}>
                {store?.name ?? '—'}
              </span>
            </div>
          )}
          <div className="border-t border-line-strong pt-3">
            <UserMenu />
          </div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col md:h-full md:overflow-hidden">
        <div className="flex-1 p-5 md:overflow-y-auto md:px-7 md:py-6 scrollbar-hidden">
          <Outlet />
        </div>
      </main>
      <Toaster
        position="bottom-right"
        toastOptions={{
          classNames: {
            toast: 'rounded-2xl! border! border-line! bg-surface! text-ink! shadow-lg! font-body!',
            title: 'font-body! font-semibold!',
            description: 'text-muted!',
          },
        }}
      />
    </div>
  )
}
