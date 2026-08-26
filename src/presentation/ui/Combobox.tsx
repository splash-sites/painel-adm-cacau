import * as PopoverPrimitive from '@radix-ui/react-popover'
import { Command as CommandPrimitive } from 'cmdk'
import { ChevronsUpDown, Search } from 'lucide-react'
import { useRef, useState } from 'react'
import { cn } from './cn'

export interface ComboboxOption {
  value: string
  label: string
}

/** Busca com autocomplete pra achar 1 item numa lista (ex: vincular grupo existente) — não cria, só encontra. */
export function Combobox({
  options,
  placeholder = 'Buscar...',
  emptyLabel = 'Nada encontrado.',
  onSelect,
  onQueryChange,
  className,
}: {
  options: ComboboxOption[]
  placeholder?: string
  emptyLabel?: string
  onSelect: (value: string) => void
  /** Quando informado, busca é server-side — quem chama já manda `options` filtrado, sem filtro client do cmdk. */
  onQueryChange?: (query: string) => void
  className?: string
}) {
  const [open, setOpen] = useState(false)
  const triggerRef = useRef<HTMLButtonElement>(null)

  /** Devolve o foco pro trigger ao fechar (boa prática de acessibilidade — não é o fix do bug de
   * Esc fechar o Dialog junto, esse fix mora em ui/Dialog.tsx, ver comentário lá). */
  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) triggerRef.current?.focus()
    setOpen(nextOpen)
  }

  return (
    <PopoverPrimitive.Root open={open} onOpenChange={handleOpenChange}>
      <PopoverPrimitive.Trigger asChild>
        <button
          ref={triggerRef}
          type="button"
          className={cn(
            'flex w-full items-center justify-between gap-2 rounded-lg border border-secondary/25 bg-background px-3 py-2 text-left font-body text-foreground/60 transition',
            'hover:bg-secondary/5',
            'focus-visible:outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/40',
            className,
          )}
        >
          <span className="flex items-center gap-2">
            <Search className="h-4 w-4 opacity-60" />
            {placeholder}
          </span>
          <ChevronsUpDown className="h-4 w-4 opacity-60" />
        </button>
      </PopoverPrimitive.Trigger>
      <PopoverPrimitive.Content
        align="start"
        sideOffset={6}
        className="z-[100] w-[320px] overflow-hidden rounded-lg border border-secondary/15 bg-background shadow-lg"
      >
        <CommandPrimitive className="w-full" shouldFilter={!onQueryChange}>
          <CommandPrimitive.Input
            placeholder={placeholder}
            onValueChange={onQueryChange}
            className="w-full border-b border-secondary/15 bg-transparent px-3 py-2 font-body text-sm text-foreground placeholder:text-foreground/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/40"
          />
          <CommandPrimitive.List className="scrollbar-hidden max-h-60 overflow-y-auto p-1">
            <CommandPrimitive.Empty className="px-2.5 py-2 font-body text-sm text-foreground/50">
              {emptyLabel}
            </CommandPrimitive.Empty>
            {options.map((option) => (
              <CommandPrimitive.Item
                key={option.value}
                value={option.label}
                onSelect={() => {
                  onSelect(option.value)
                  handleOpenChange(false)
                }}
                className="flex cursor-pointer select-none items-center rounded-md px-2.5 py-2 font-body text-sm outline-none data-[selected=true]:bg-primary/10"
              >
                {option.label}
              </CommandPrimitive.Item>
            ))}
          </CommandPrimitive.List>
        </CommandPrimitive>
      </PopoverPrimitive.Content>
    </PopoverPrimitive.Root>
  )
}
