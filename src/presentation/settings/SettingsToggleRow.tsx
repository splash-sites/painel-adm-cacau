import type { ReactNode } from 'react'

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
