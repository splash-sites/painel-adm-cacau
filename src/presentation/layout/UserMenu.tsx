import { ChevronUp, LogOut } from 'lucide-react'
import { useAuth } from '../auth/useAuth'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../ui/DropdownMenu'

const ROLE_LABEL: Record<string, string> = {
  super_admin: 'Administração geral',
  store_admin: 'Administração da loja',
}

export function UserMenu() {
  const { session, signOut } = useAuth()

  const displayName = session?.profile.fullName || session?.email || ''
  const roleLabel = session ? ROLE_LABEL[session.profile.role] : undefined

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="flex w-full items-center justify-between gap-2 rounded-xl px-2 py-1.5 text-left font-body text-ink transition-colors hover:bg-surface"
        >
          <span className="flex min-w-0 flex-col gap-px">
            <span className="truncate text-sm font-semibold" title={displayName}>
              {displayName}
            </span>
            {roleLabel && <span className="truncate text-[13px] text-faint">{roleLabel}</span>}
          </span>
          <ChevronUp className="h-4 w-4 shrink-0 text-muted" aria-hidden="true" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent side="top" align="start" className="w-[--radix-popper-anchor-width]">
        <DropdownMenuItem onSelect={() => signOut()}>
          <LogOut className="h-4 w-4 shrink-0" aria-hidden="true" />
          Sair
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
