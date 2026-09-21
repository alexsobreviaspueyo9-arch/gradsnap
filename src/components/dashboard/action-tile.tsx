import Link from 'next/link'
import { ArrowUpRight, type LucideIcon } from 'lucide-react'

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
      className="group flex h-full items-start gap-4 rounded-3xl bg-card p-6 ring-1 ring-foreground/10 transition-all duration-300 hover:-translate-y-0.5 hover:ring-primary/60 hover:shadow-[0_20px_40px_-24px_var(--shadow-tint)] active:scale-[0.99]"
    >
      <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-accent text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
        <Icon className="size-5" strokeWidth={1.75} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-heading text-lg font-semibold tracking-tight">
          {title}
        </span>
        <span className="mt-1 block text-sm text-muted-foreground">
          {description}
        </span>
      </span>
      <ArrowUpRight className="size-5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-primary" />
    </Link>
  )
}
