import type { InputHTMLAttributes } from 'react'
import { cn } from './cn'

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        'w-full rounded-lg border border-secondary/25 bg-background px-3 py-2 text-foreground transition',
        'placeholder:text-foreground/40',
        'focus-visible:outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/40',
        className,
      )}
      {...props}
    />
  )
}
