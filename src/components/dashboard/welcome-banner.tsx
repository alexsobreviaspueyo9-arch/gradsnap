import Link from 'next/link'
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
        'flex min-h-[240px] flex-col justify-between gap-8 rounded-3xl bg-card p-8 md:p-10',
        className
      )}
    >
      <div>
        <p className="text-sm font-medium text-muted-foreground">Welcome back</p>
        <h1 className="mt-1 text-4xl leading-[1.05] font-semibold tracking-[-0.03em] text-balance md:text-5xl">
          {name}
        </h1>
        <p className="mt-3 max-w-md text-base text-muted-foreground">{subtitle}</p>
      </div>
      <Link
        href={cta.href}
        className={cn(buttonVariants({ size: 'lg' }), 'h-12 self-start px-6 text-base')}
      >
        {cta.label}
      </Link>
    </section>
  )
}
