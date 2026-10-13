import Link from 'next/link'
import { SearchX } from 'lucide-react'
import { CenteredShell } from '@/components/brand/centered-shell'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export default function NotFound() {
  return (
    <CenteredShell>
      <div className="rounded-3xl bg-card p-8 text-center">
        <span className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-muted text-foreground">
          <SearchX className="size-7" strokeWidth={1.75} />
        </span>
        <h1 className="mt-5 text-2xl font-bold tracking-tight">
          Page not found
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you&apos;re looking for doesn&apos;t exist or has moved.
        </p>
        <Link href="/" className={cn(buttonVariants(), 'mt-6')}>
          Back to home
        </Link>
      </div>
    </CenteredShell>
  )
}
