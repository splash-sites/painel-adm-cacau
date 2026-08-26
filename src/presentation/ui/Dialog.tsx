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
      <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/40" />
      <DialogPrimitive.Content
        onEscapeKeyDown={(event) => {
          preventEscapeWhilePopperOpen(event)
          onEscapeKeyDown?.(event)
        }}
        className={cn(
          'fixed left-1/2 top-1/2 z-50 w-full max-w-sm -translate-x-1/2 -translate-y-1/2 space-y-4 rounded-2xl border border-secondary/15 bg-background p-6 font-body shadow-sm sm:p-8',
          className,
        )}
        {...props}
      >
        {children}
      </DialogPrimitive.Content>
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
      <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/40" />
      <DialogPrimitive.Content
        onEscapeKeyDown={(event) => {
          preventEscapeWhilePopperOpen(event)
          onEscapeKeyDown?.(event)
        }}
        className={cn(
          'fixed right-0 top-0 z-50 h-full w-full max-w-md overflow-y-auto border-l border-secondary/15 bg-background p-6 font-body shadow-lg sm:p-8',
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
  return <DialogPrimitive.Title className={cn('font-display text-xl text-accent', className)} {...props} />
}

export function DialogDescription({ className, ...props }: ComponentProps<typeof DialogPrimitive.Description>) {
  return <DialogPrimitive.Description className={cn('text-sm text-foreground/70', className)} {...props} />
}

export function DialogFooter({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('flex justify-end gap-2 pt-2', className)} {...props} />
}
