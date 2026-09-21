import { cn } from '@/lib/utils'

export function PageHeader({
  title,
  description,
  action,
  className,
}: {
  title: string
  description?: string
  action?: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'mb-8 flex flex-wrap items-end justify-between gap-4',
        className
      )}
    >
      <div className="max-w-2xl">
        <h1 className="font-heading text-3xl font-bold tracking-[-0.03em] text-balance sm:text-4xl">
          {title}
        </h1>
        {description && (
          <p className="mt-2 text-base text-muted-foreground">{description}</p>
        )}
      </div>
      {action}
    </div>
  )
}
