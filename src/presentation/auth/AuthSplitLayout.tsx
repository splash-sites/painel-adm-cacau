import type { ReactNode } from 'react'

/** Tela dividida do login e do primeiro acesso: marca no painel escuro, formulário no claro. */
export function AuthSplitLayout({
  title,
  description,
  children,
}: {
  title: string
  description: string
  children: ReactNode
}) {
  return (
    <div className="flex min-h-screen flex-col bg-canvas text-ink md:flex-row">
      <div className="relative flex flex-col justify-between gap-10 overflow-hidden bg-[#1b110e] px-6 py-8 text-[#f6ede6] md:flex-1 md:p-14">
        <img src="/prestio-logo-negativo.svg" alt="Prestio" className="h-10 w-auto self-start" />
        <div
          aria-hidden="true"
          className="absolute -right-16 top-28 hidden h-[420px] w-80 rounded-[28px] bg-caramel md:block"
        />
        <div
          aria-hidden="true"
          className="absolute right-[280px] top-56 hidden h-36 w-36 rounded-[20px] bg-[#3b2620] lg:block"
        />
        <div className="relative flex max-w-md flex-col gap-3.5">
          <h1 className="font-display text-4xl font-bold leading-none tracking-tight md:text-[56px]">{title}</h1>
          <p className="text-base text-[#b9a69a]">{description}</p>
        </div>
      </div>
      <div className="flex flex-1 items-center justify-center px-6 py-10 md:w-[520px] md:flex-none">
        <div className="w-full max-w-[360px]">{children}</div>
      </div>
    </div>
  )
}

export const authLabelClass = 'flex flex-col gap-1.5 text-sm text-muted'
export const authInputClass =
  'h-12 w-full rounded-[14px] border-[1.5px] border-line-strong bg-surface px-3.5 text-base text-ink transition focus:border-ink focus:outline-none focus:ring-2 focus:ring-caramel/50'
export const authButtonClass =
  'h-[50px] w-full rounded-[14px] bg-ink text-base font-semibold text-white transition hover:bg-[#3d2820] disabled:pointer-events-none disabled:opacity-50'
