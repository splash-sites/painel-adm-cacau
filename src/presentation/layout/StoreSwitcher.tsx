import { useEffect } from 'react'
import { ChevronsUpDown, Plus } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAllStores } from '../store/useStores'
import { useActiveStore } from '../storeContext/useActiveStore'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/DropdownMenu'

export function StoreSwitcher() {
  const navigate = useNavigate()
  const { data: stores, isFetching } = useAllStores()
  const { activeStoreId, setActiveStoreId } = useActiveStore()

  useEffect(() => {
    if (!stores) return
    const stillExists = stores.some((store) => store.id === activeStoreId)
    if (!stillExists && stores.length) {
      setActiveStoreId(stores[0].id)
    }
  }, [stores, isFetching, activeStoreId, setActiveStoreId])

  const activeStoreName = stores?.find((store) => store.id === activeStoreId)?.name ?? 'Selecione a loja'

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={`Trocar unidade. Unidade atual: ${activeStoreName}`}
          className="flex w-full items-center justify-between gap-2 rounded-xl bg-surface px-3 py-2.5 text-left font-body text-ink transition-colors hover:bg-chosen"
        >
          <span className="flex min-w-0 flex-col gap-px">
            <span className="text-xs text-faint">Unidade</span>
            <span className="truncate text-sm font-semibold" title={activeStoreName}>
              {activeStoreName}
            </span>
          </span>
          <ChevronsUpDown className="h-4 w-4 shrink-0 text-muted" aria-hidden="true" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent side="top" align="start" className="w-[--radix-popper-anchor-width]">
        {stores?.map((store) => (
          <DropdownMenuItem
            key={store.id}
            title={store.name}
            className={store.id === activeStoreId ? 'font-semibold' : ''}
            onSelect={() => setActiveStoreId(store.id)}
          >
            {store.name}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => navigate('/lojas/nova')}>
          <Plus className="h-4 w-4 shrink-0" aria-hidden="true" />
          Criar loja
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
