import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white px-4 text-center">
      <Badge variant="secondary" className="mb-6">
        Sprint 1 — Auth &amp; Profiles
      </Badge>
      <h1 className="text-5xl font-bold tracking-tight text-gray-900 mb-4">
        Grad<span className="text-primary">Snap</span>
      </h1>
      <p className="text-xl text-muted-foreground max-w-md mb-10">
        Connect with professional photographers for your graduation session.
        Book in minutes.
      </p>
      <div className="flex gap-4">
        <Link href="/register" className={cn(buttonVariants({ size: 'lg' }))}>
          Get started
        </Link>
        <Link
          href="/login"
          className={cn(buttonVariants({ variant: 'outline', size: 'lg' }))}
        >
          Sign in
        </Link>
      </div>
    </div>
  )
}
