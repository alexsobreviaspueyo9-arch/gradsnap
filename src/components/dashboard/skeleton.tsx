import { cn } from '@/lib/utils'

export function Skeleton({ className }: { className?: string }) {
  return (
    <div aria-hidden className={cn('rounded-2xl bg-muted motion-safe:animate-pulse', className)} />
  )
}

export const SKELETON_PANEL = 'rounded-2xl border border-border bg-card p-6 sm:p-8'
