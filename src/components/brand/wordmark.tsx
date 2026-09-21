import Link from 'next/link'
import { Aperture } from 'lucide-react'
import { cn } from '@/lib/utils'

export function Wordmark({
  href = '/',
  className,
}: {
  href?: string
  className?: string
}) {
  return (
    <Link
      href={href}
      aria-label="GradSnap home"
      className={cn(
        'inline-flex items-center gap-2 font-heading text-xl font-bold tracking-tight',
        className
      )}
    >
      <span className="flex size-8 items-center justify-center rounded-xl bg-primary text-primary-foreground">
        <Aperture className="size-4.5" strokeWidth={2} />
      </span>
      <span>
        Grad<span className="text-primary">Snap</span>
      </span>
    </Link>
  )
}
