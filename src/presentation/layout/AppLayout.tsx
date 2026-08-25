import { useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { Toaster } from 'sonner'
import { useAuth } from '../auth/useAuth'
import { useOrderNotifications } from '../order/useOrderNotifications'
import { useEffectiveStoreId } from '../storeContext/useEffectiveStoreId'
import { StoreSwitcher } from './StoreSwitcher'
import { UserMenu } from './UserMenu'

const linkClass = ({ isActive }: { isActive: boolean }) =>
  `block px-3 py-2 rounded-lg font-body transition-colors ${
    isActive ? 'bg-primary text-primary-foreground' : 'text-accent-foreground hover:bg-primary/20'
  }`

export function AppLayout() {
  const { session } = useAuth()
  const isSuperAdmin = session?.profile.role === 'super_admin'
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const storeId = useEffectiveStoreId()
  useOrderNotifications(storeId)

  return (
    <div className="min-h-screen bg-background text-foreground md:flex md:h-screen md:overflow-hidden">
      <div className="flex items-center justify-between border-b border-secondary/20 p-4 md:hidden">
        <h1 className="font-display text-xl text-accent">Splash Pedidos</h1>
        <div className="flex items-center gap-2">
          <UserMenu />
          <button
            type="button"
            onClick={() => setSidebarOpen((open) => !open)}
            aria-label="Abrir menu"
            aria-expanded={sidebarOpen}
            className="rounded border border-secondary/30 px-3 py-2"
          >
            Menu
          </button>
        </div>
      </div>

      <aside
        className={`${
          sidebarOpen ? 'flex' : 'hidden'
        } md:flex w-full md:w-60 shrink-0 flex-col bg-accent text-accent-foreground md:h-full md:overflow-y-auto`}
      >
        <div className="hidden md:flex items-center h-16 px-4 border-b border-accent-foreground/20 md:shrink-0">
          <h1 className="font-display text-xl">Splash Pedidos</h1>
        </div>
        <div className="flex flex-col flex-1 p-4">
          <nav className="flex flex-col gap-1">
            <NavLink to="/" end className={linkClass} onClick={() => setSidebarOpen(false)}>
              Dashboard
            </NavLink>
            <NavLink to="/produtos" className={linkClass} onClick={() => setSidebarOpen(false)}>
              Produtos
            </NavLink>
            <NavLink to="/promocoes" className={linkClass} onClick={() => setSidebarOpen(false)}>
              Promoções
            </NavLink>
            <NavLink to="/atendentes" className={linkClass} onClick={() => setSidebarOpen(false)}>
              Atendentes
            </NavLink>
            {isSuperAdmin && (
              <NavLink to="/relatorios" className={linkClass} onClick={() => setSidebarOpen(false)}>
                Relatórios
              </NavLink>
            )}
            <NavLink to="/historico" className={linkClass} onClick={() => setSidebarOpen(false)}>
              Histórico
            </NavLink>
            {isSuperAdmin && (
              <NavLink to="/usuarios" className={linkClass} onClick={() => setSidebarOpen(false)}>
                Usuários
              </NavLink>
            )}
          </nav>
          <div className="mt-auto space-y-1">
            {isSuperAdmin && <StoreSwitcher />}
            <div className="border-t border-accent-foreground/20 pt-4">
              <NavLink to="/configuracoes" end className={linkClass} onClick={() => setSidebarOpen(false)}>
                Configurações
              </NavLink>
            </div>
          </div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col md:h-full md:overflow-hidden">
        <div className="hidden md:flex items-center justify-end h-16 px-4 border-b border-secondary/20 md:shrink-0">
          <UserMenu />
        </div>
        <div className="bg-secondary/5 p-6 flex-1 md:overflow-y-auto scrollbar-hidden">
          <Outlet />
        </div>
      </main>
      <Toaster
        position="bottom-right"
        toastOptions={{
          classNames: {
            toast:
              'rounded-2xl! border! border-secondary/15! bg-background! text-foreground! shadow-lg! font-body!',
            title: 'font-body!',
            description: 'text-foreground/70!',
          },
        }}
      />
    </div>
  )
}
