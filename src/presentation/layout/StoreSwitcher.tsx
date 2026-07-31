import { useEffect } from 'react'
import { ChevronDown, Plus } from 'lucide-react'
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
  const { data: stores } = useAllStores()
  const { activeStoreId, setActiveStoreId } = useActiveStore()

  useEffect(() => {
    if (!stores) return
    const stillExists = stores.some((store) => store.id === activeStoreId)
    if (!stillExists && stores.length) {
      setActiveStoreId(stores[0].id)
    }
  }, [stores, activeStoreId, setActiveStoreId])

  const activeStoreName = stores?.find((store) => store.id === activeStoreId)?.name ?? 'Selecione a loja'

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="flex w-full items-center justify-between gap-2 rounded px-3 py-2 font-body text-accent-foreground hover:bg-primary/20"
        >
          <span className="truncate" title={activeStoreName}>
            {activeStoreName}
          </span>
          <ChevronDown className="h-4 w-4 shrink-0" aria-hidden="true" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent side="top" align="start" className="w-[--radix-popper-anchor-width]">
        {stores?.map((store) => (
          <DropdownMenuItem
            key={store.id}
            title={store.name}
            className={store.id === activeStoreId ? 'font-medium' : ''}
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
