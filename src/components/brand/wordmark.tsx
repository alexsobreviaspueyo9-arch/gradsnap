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
        'inline-flex min-h-11 items-center gap-2 text-lg font-semibold',
        className
      )}
    >
      <Aperture className="size-5 text-primary" strokeWidth={1.75} aria-hidden />
      GradSnap
    </Link>
  )
}
