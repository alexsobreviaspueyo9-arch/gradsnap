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
      <header className="relative">
        <Wordmark />
      </header>
      <main id="main" className="relative flex flex-1 items-center justify-center py-10">
        <div className={cn('w-full max-w-md', className)}>{children}</div>
      </main>
    </div>
  )
}
