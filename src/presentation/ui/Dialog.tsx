import * as DialogPrimitive from '@radix-ui/react-dialog'
import type { ComponentProps, HTMLAttributes } from 'react'
import { cn } from './cn'

export const Dialog = DialogPrimitive.Root
export const DialogTrigger = DialogPrimitive.Trigger
export const DialogClose = DialogPrimitive.Close

/**
 * Esc com um Combobox/Select/DropdownMenu aberto por cima fecha o Dialog inteiro junto — os 2
 * fecham na mesma execução síncrona do Radix (isHighestLayer não isola os dois corretamente
 * quando o popover não é portaled, que é como o Combobox deste app funciona por outro bug já
 * corrigido, ver Combobox.tsx). Trava aqui, central: se algum popper do Radix tá aberto no
 * momento do Esc, o Dialog não fecha — quem fecha é o popover, como já faz sozinho.
 */
function preventEscapeWhilePopperOpen(event: KeyboardEvent) {
  if (document.querySelector('[data-radix-popper-content-wrapper]')) {
    event.preventDefault()
  }
}

export function DialogContent({
  className,
  children,
  onEscapeKeyDown,
  ...props
}: ComponentProps<typeof DialogPrimitive.Content>) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-[rgba(42,26,20,0.4)]" />
      {/* Centraliza via flex, não via transform: um Popper do Radix (Combobox/Select) aberto
          dentro do Dialog usa position:fixed pra se posicionar — um ancestral com transform
          (o -translate-x/y de antes) vira containing block desse fixed e quebra o cálculo de
          posição do Radix, fazendo o conteúdo rolável do Dialog pular pro topo sozinho ao abrir
          o popover (bug real, corrigido). Sem transform em nenhum ancestral, esse problema some. */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <DialogPrimitive.Content
          onEscapeKeyDown={(event) => {
            preventEscapeWhilePopperOpen(event)
            onEscapeKeyDown?.(event)
          }}
          className={cn(
            'w-full max-w-md space-y-4 rounded-3xl bg-surface p-6 font-body shadow-[0_24px_64px_-24px_rgba(42,26,20,0.45)]',
            className,
          )}
          {...props}
        >
          {children}
        </DialogPrimitive.Content>
      </div>
    </DialogPrimitive.Portal>
  )
}

/** Painel lateral (drawer) à direita — mesma família de primitives do Dialog, só posicionamento diferente. */
export function DialogSideContent({
  className,
  children,
  onEscapeKeyDown,
  ...props
}: ComponentProps<typeof DialogPrimitive.Content>) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-[rgba(42,26,20,0.4)]" />
      <DialogPrimitive.Content
        onEscapeKeyDown={(event) => {
          preventEscapeWhilePopperOpen(event)
          onEscapeKeyDown?.(event)
        }}
        className={cn(
          'fixed right-0 top-0 z-50 h-full w-full max-w-md overflow-y-auto bg-surface p-6 font-body shadow-[0_24px_64px_-24px_rgba(42,26,20,0.45)] sm:p-7',
          className,
        )}
        {...props}
      >
        {children}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  )
}

export function DialogTitle({ className, ...props }: ComponentProps<typeof DialogPrimitive.Title>) {
  return <DialogPrimitive.Title className={cn('font-display text-2xl font-bold leading-tight text-ink', className)} {...props} />
}

export function DialogDescription({ className, ...props }: ComponentProps<typeof DialogPrimitive.Description>) {
  return <DialogPrimitive.Description className={cn('text-sm text-muted', className)} {...props} />
}

export function DialogFooter({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('flex justify-end gap-2 pt-2', className)} {...props} />
}
