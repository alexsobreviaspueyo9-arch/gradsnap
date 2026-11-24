import Link from 'next/link'
import { ChevronRight, type LucideIcon } from 'lucide-react'

export function ActionTile({
  href,
  icon: Icon,
  title,
  description,
}: {
  href: string
  icon: LucideIcon
  title: string
  description: string
}) {
  return (
    <Link
      href={href}
      className="gs-lift group flex h-full items-center gap-4 rounded-2xl border border-border bg-card p-6 gs-elev-1 active:bg-muted"
    >
      <span className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-border bg-[color:var(--accent)] text-[color:var(--accent-foreground)]">
        <Icon className="size-5" strokeWidth={1.75} aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-lg font-medium">{title}</span>
        <span className="mt-0.5 block text-sm text-muted-foreground">
          {description}
        </span>
      </span>
      <ChevronRight
        className="size-5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5"
        aria-hidden
      />
    </Link>
  )
}
