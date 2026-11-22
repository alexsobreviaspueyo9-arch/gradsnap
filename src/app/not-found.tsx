import Image from 'next/image'
import Link from 'next/link'
import { CenteredShell } from '@/components/brand/centered-shell'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { PLACEHOLDER_PHOTOS } from '@/lib/placeholder-photos'

// Empty state: one stand-in campus photo, credited right under it (this page
// has no footer). TODO replace with real photo.
const PHOTO = PLACEHOLDER_PHOTOS.burrussTower

export default function NotFound() {
  return (
    <CenteredShell className="max-w-4xl">
      <div className="grid items-center gap-10 md:grid-cols-[minmax(0,1fr)_minmax(0,0.75fr)] md:gap-16">
        <div className="min-w-0">
          <p className="text-sm text-muted-foreground tabular-nums">Error 404</p>
          <h1 className="mt-3 font-display text-5xl leading-[1.06] font-normal">Page not found</h1>
          <p className="mt-4 max-w-sm text-base leading-relaxed text-muted-foreground">
            The page you&apos;re looking for doesn&apos;t exist or has moved.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3">
            <Link href="/" className={cn(buttonVariants({ size: 'lg' }), 'h-11 px-5 text-base')}>
              Back to home
            </Link>
            <Link
              href="/photographers"
              className="flex min-h-11 items-center text-base text-muted-foreground underline underline-offset-4 transition-colors hover:text-foreground"
            >
              Find a photographer
            </Link>
          </div>
        </div>
        <figure className="min-w-0">
          <div className="relative aspect-[4/5] overflow-hidden rounded-2xl bg-muted">
            <Image src={PHOTO.src} alt={PHOTO.alt} fill priority sizes="(min-width: 768px) 32vw, 100vw" className="object-cover" />
          </div>
          <figcaption className="mt-3 text-xs text-muted-foreground">
            Example photo:{' '}
            <a href={PHOTO.page} className="underline underline-offset-2 hover:text-foreground">
              {PHOTO.author}
            </a>{' '}
            ({PHOTO.license}), Wikimedia Commons
          </figcaption>
        </figure>
      </div>
    </CenteredShell>
  )
}
