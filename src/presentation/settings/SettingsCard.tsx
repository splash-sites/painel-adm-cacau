import type { ReactNode } from 'react'

/** Mesmo cartão branco dos pedidos, usado em cada assunto de Configurações. */
export const settingsCardClass = 'flex flex-col gap-3 rounded-[20px] bg-surface p-5'

export function SettingsCardTitle({ children }: { children: ReactNode }) {
  return <h3 className="font-display text-xl font-bold leading-tight">{children}</h3>
}

/** Etiqueta de situação no canto do card ("3 de 4", "Atenção"). */
export function SettingsPill({ tone, children }: { tone: 'info' | 'wait' | 'success' | 'muted'; children: ReactNode }) {
  const toneClass = {
    info: 'bg-info-soft text-info',
    wait: 'bg-wait-soft text-wait',
    success: 'bg-success-soft text-success',
    muted: 'bg-surface-2 text-muted',
  }[tone]
  return (
    <span className={`shrink-0 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ${toneClass}`}>
      {children}
    </span>
  )
}

/** Linha com texto à esquerda e um interruptor à direita, separada por fio. */
export function SettingsToggleRow({
  label,
  hint,
  hintTone = 'muted',
  control,
}: {
  label: string
  hint?: string
  hintTone?: 'muted' | 'wait'
  control: ReactNode
}) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-line py-2.5 last:border-0">
      <span className="flex min-w-0 flex-col">
        <span className="text-[15px]">{label}</span>
        {hint && <span className={`text-[13px] ${hintTone === 'wait' ? 'text-wait' : 'text-muted'}`}>{hint}</span>}
      </span>
      {control}
    </div>
  )
}
