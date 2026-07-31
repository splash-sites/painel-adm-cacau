import { useEffect, useRef, useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { useAuth } from '../auth/useAuth'
import { initials } from '../ui/initials'

export function UserMenu() {
  const { session, signOut } = useAuth()
  const [open, setOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const displayName = session?.profile.fullName || session?.email || ''

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex items-center gap-2 rounded px-3 py-2 font-body hover:bg-primary/10"
      >
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/20 text-xs font-semibold text-accent">
          {initials(session?.profile.fullName)}
        </span>
        <span>{displayName}</span>
        <ChevronDown
          className={`h-4 w-4 transition-transform motion-reduce:transition-none ${open ? 'rotate-180' : ''}`}
          aria-hidden="true"
        />
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 mt-1 w-40 rounded border border-secondary/30 bg-background shadow-lg z-10"
        >
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false)
              signOut()
            }}
            className="w-full text-left px-4 py-2 font-body hover:bg-primary/10 rounded"
          >
            Sair
          </button>
        </div>
      )}
    </div>
  )
}
