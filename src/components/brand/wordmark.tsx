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
        'inline-flex items-center gap-2 text-lg font-semibold tracking-tight',
        className
      )}
    >
      <span className="flex size-8 items-center justify-center rounded-[10px] bg-primary text-primary-foreground">
        <Aperture className="size-4.5" strokeWidth={2} />
      </span>
      GradSnap
    </Link>
  )
}
