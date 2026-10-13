import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

export function StatTile({
  label,
  value,
  icon: Icon,
  className,
}: {
  label: string
  value: string
  icon: LucideIcon
  className?: string
}) {
  return (
    <div
      className={cn(
        'flex flex-col justify-between gap-8 rounded-3xl bg-card p-6',
        className
      )}
    >
      <Icon className="size-6 text-muted-foreground" strokeWidth={1.75} aria-hidden />
      <div>
        <p className="text-5xl font-semibold tracking-[-0.04em] tabular-nums">
          {value}
        </p>
        <p className="mt-1 text-sm text-muted-foreground">{label}</p>
      </div>
    </div>
  )
}
