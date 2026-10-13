import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

export function IconChip({
  icon: Icon,
  className,
  iconClassName,
}: {
  icon: LucideIcon
  className?: string
  iconClassName?: string
}) {
  return (
    <div
      className={cn(
        'flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-muted text-foreground',
        className
      )}
    >
      <Icon className={cn('h-4.5 w-4.5', iconClassName)} />
    </div>
  )
}
