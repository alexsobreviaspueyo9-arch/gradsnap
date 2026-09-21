import { Wordmark } from '@/components/brand/wordmark'
import { cn } from '@/lib/utils'

export function CenteredShell({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className="relative flex min-h-[100dvh] flex-col px-4 py-6 sm:px-8">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_45%_at_50%_0%,var(--brand-glow),transparent_70%)]"
      />
      <div className="relative">
        <Wordmark />
      </div>
      <div className="relative flex flex-1 items-center justify-center py-10">
        <div className={cn('w-full max-w-md', className)}>{children}</div>
      </div>
    </div>
  )
}
