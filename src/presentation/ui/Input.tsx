import type { InputHTMLAttributes } from 'react'
import { cn } from './cn'

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        'w-full rounded-xl border-[1.5px] border-line-strong bg-surface px-3.5 py-2.5 text-[15px] text-ink transition',
        'placeholder:text-faint',
        'focus-visible:outline-none focus-visible:border-ink focus-visible:ring-2 focus-visible:ring-caramel/50',
        className,
      )}
      {...props}
    />
  )
}
