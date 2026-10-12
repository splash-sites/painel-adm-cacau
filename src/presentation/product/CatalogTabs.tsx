import { NavLink } from 'react-router-dom'

const TABS = [
  { to: '/produtos', label: 'Produtos' },
  { to: '/produtos/categorias', label: 'Categorias' },
  { to: '/produtos/adicionais', label: 'Adicionais' },
  { to: '/produtos/variacoes', label: 'Variações' },
]

/** Abas das seções do catálogo. Substitui os botões "Adicionais", "Variações" etc. no topo de cada tela. */
export function CatalogTabs() {
  return (
    <nav aria-label="Seções do catálogo" className="flex gap-1 overflow-x-auto border-b border-line text-sm">
      {TABS.map((tab) => (
        <NavLink
          key={tab.to}
          to={tab.to}
          end
          className={({ isActive }) =>
            `-mb-px whitespace-nowrap border-b-2 px-3 py-2 transition-colors ${
              isActive ? 'border-caramel font-semibold text-ink' : 'border-transparent text-faint hover:text-ink'
            }`
          }
        >
          {tab.label}
        </NavLink>
      ))}
    </nav>
  )
}
