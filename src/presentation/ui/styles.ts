export type ButtonVariant = 'primary' | 'outline' | 'danger' | 'danger-ghost'

const BUTTON_VARIANTS: Record<ButtonVariant, string> = {
  primary: 'bg-primary text-primary-foreground shadow-sm hover:shadow-md hover:brightness-95',
  outline: 'border border-secondary/25 text-foreground hover:bg-secondary/5',
  danger: 'bg-red-600 text-white shadow-sm hover:bg-red-700',
  'danger-ghost': 'text-red-700',
}

export function buttonClass(variant: ButtonVariant = 'primary'): string {
  const base =
    'inline-flex items-center justify-center rounded-lg px-4 py-2 font-medium font-body transition disabled:opacity-50 disabled:pointer-events-none'
  return `${base} ${BUTTON_VARIANTS[variant]}`
}

export const cardClass = 'rounded-2xl border border-secondary/15 bg-background p-6 shadow-sm sm:p-8'

/** Mesmo cartão, sem padding — pra tabela que precisa que a linha encoste na borda. */
export const tableCardClass = 'rounded-2xl border border-secondary/15 bg-background shadow-sm overflow-hidden'

export const inputClass =
  'w-full rounded-lg border border-secondary/25 bg-background px-3 py-2 text-foreground transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40'

export const tableHeaderCellClass =
  'py-2.5 text-left text-xs font-medium uppercase tracking-wide text-foreground/50 whitespace-nowrap'

export const tableRowClass = 'border-b border-secondary/10 last:border-0 hover:bg-secondary/5 transition-colors'
