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
        'flex flex-col justify-between gap-8 rounded-3xl bg-card p-6 ring-1 ring-foreground/10',
        className
      )}
    >
      <span className="flex size-10 items-center justify-center rounded-2xl bg-accent text-primary">
        <Icon className="size-5" strokeWidth={1.75} />
      </span>
      <div>
        <p className="font-heading text-5xl font-bold tracking-[-0.04em] tabular-nums">
          {value}
        </p>
        <p className="mt-1 text-sm text-muted-foreground">{label}</p>
      </div>
    </div>
  )
}
