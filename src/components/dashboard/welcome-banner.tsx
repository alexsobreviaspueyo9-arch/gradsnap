import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { buttonVariants } from '@/components/ui/button'

export function WelcomeBanner({
  name,
  subtitle,
  cta,
  className,
}: {
  name: string
  subtitle: string
  cta: { href: string; label: string }
  className?: string
}) {
  return (
    <section
      className={cn(
        'relative flex min-h-[260px] flex-col justify-between gap-10 overflow-hidden rounded-3xl bg-primary p-8 text-primary-foreground md:p-10',
        className
      )}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -top-28 -right-20 size-96 rounded-full bg-[radial-gradient(closest-side,oklch(1_0_0/0.28),transparent)]"
      />
      <div className="relative">
        <p className="text-sm font-medium opacity-80">Welcome back</p>
        <h1 className="mt-2 font-heading text-4xl leading-[1.05] font-bold tracking-[-0.03em] text-balance md:text-5xl">
          {name}
        </h1>
        <p className="mt-3 max-w-md text-base opacity-85">{subtitle}</p>
      </div>
      <div className="relative">
        <Link
          href={cta.href}
          className={cn(
            buttonVariants({ size: 'lg' }),
            'group h-11 bg-primary-foreground px-6 text-base text-primary hover:bg-primary-foreground/90'
          )}
        >
          {cta.label}
          <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
        </Link>
      </div>
    </section>
  )
}
