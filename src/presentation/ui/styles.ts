export type ButtonVariant = 'primary' | 'outline' | 'danger' | 'danger-ghost'

const BUTTON_VARIANTS: Record<ButtonVariant, string> = {
  primary: 'bg-ink text-white hover:bg-[#3d2820]',
  outline: 'border-[1.5px] border-line-strong bg-transparent text-ink hover:bg-canvas',
  danger: 'bg-danger text-white hover:bg-danger',
  'danger-ghost': 'text-danger hover:bg-danger-soft',
}

export function buttonClass(variant: ButtonVariant = 'primary'): string {
  const base =
    'inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 py-2 text-[15px] font-semibold font-body transition disabled:opacity-50 disabled:pointer-events-none'
  return `${base} ${BUTTON_VARIANTS[variant]}`
}

export const cardClass = 'rounded-2xl bg-surface p-5 sm:p-6'

/** Mesmo cartão, sem padding — pra tabela que precisa que a linha encoste na borda. */
export const tableCardClass = 'rounded-2xl bg-surface overflow-hidden'

export const inputClass =
  'w-full rounded-xl border-[1.5px] border-line-strong bg-surface px-3.5 py-2.5 text-[15px] text-ink transition focus:border-ink focus:outline-none focus:ring-2 focus:ring-caramel/50'

export const tableHeaderCellClass =
  'py-3 text-left text-[13px] font-medium text-muted whitespace-nowrap'

export const tableRowClass = 'border-b border-line last:border-0 hover:bg-canvas transition-colors'
