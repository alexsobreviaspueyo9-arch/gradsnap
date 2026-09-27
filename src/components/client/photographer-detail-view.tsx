import Link from 'next/link'
import { PortfolioImage } from '@/components/portfolio-image'
import {
  Aperture,
  ArrowLeft,
  AtSign,
  Clock,
  CreditCard,
  Link as LinkIcon,
  MapPin,
} from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { cn } from '@/lib/utils'
import { normalizeHttpUrl } from '@/lib/url'
import { formatPriceRange } from '@/lib/price'
import { BookingWidget } from '@/components/client/BookingWidget'
import {
  WEEKDAYS,
  DEPOSIT_POLICY_LABELS,
  type AvailabilitySlot,
  type PhotographerProfile,
  type PortfolioPhoto,
  type Weekday,
} from '@/types/database'

const DAY_LABELS: Record<Weekday, string> = {
  mon: 'Mon',
  tue: 'Tue',
  wed: 'Wed',
  thu: 'Thu',
  fri: 'Fri',
  sat: 'Sat',
  sun: 'Sun',
}

const PANEL = 'rounded-3xl bg-card p-6 ring-1 ring-foreground/10 sm:p-8'

export function PhotographerDetailView({
  photographer,
  photos,
  slots,
  justBooked,
  paymentsEnabled,
}: {
  photographer: PhotographerProfile
  photos: PortfolioPhoto[]
  slots: AvailabilitySlot[]
  justBooked: boolean
  paymentsEnabled: boolean
}) {
  const name = photographer.display_name ?? 'Photographer'
  const style =
    photographer.specialty === 'Other'
      ? photographer.specialty_other
      : photographer.specialty
  const priceRange = formatPriceRange(
    photographer.base_price,
    photographer.price_max
  )
  const instagramHref = normalizeHttpUrl(photographer.instagram_url)
  const socialLinks = (photographer.social_links ?? []).flatMap((link) => {
    const href = normalizeHttpUrl(link.url)
    return href ? [{ label: link.label, href }] : []
  })
  const hasLinks = instagramHref !== null || socialLinks.length > 0
  const hasWeekly = Object.keys(photographer.weekly_availability ?? {}).length > 0

  return (
    <>
      <Link
        href="/dashboard/client/photographers"
        className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Back to photographers
      </Link>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:items-start">
        <div className="space-y-6">
          <section className={PANEL}>
            <div className="flex items-start gap-4">
              <span
                aria-hidden
                className="flex size-16 shrink-0 items-center justify-center rounded-full bg-primary font-heading text-2xl font-bold text-primary-foreground"
              >
                {name.charAt(0).toUpperCase()}
              </span>
              <div className="min-w-0">
                <h1 className="font-heading text-3xl leading-tight font-bold tracking-[-0.03em] sm:text-4xl">
                  {name}
                </h1>
                <p className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                  {photographer.city && (
                    <span className="inline-flex items-center gap-1.5">
                      <MapPin className="size-4" />
                      {photographer.city}
                    </span>
                  )}
                  {style && (
                    <span className="inline-flex items-center gap-1.5">
                      <Aperture className="size-4" />
                      {style}
                    </span>
                  )}
                  {photographer.session_duration_minutes && (
                    <span className="inline-flex items-center gap-1.5">
                      <Clock className="size-4" />~
                      {photographer.session_duration_minutes} min
                    </span>
                  )}
                </p>
              </div>
            </div>

            {priceRange && (
              <p className="mt-6 font-heading text-4xl font-bold tracking-[-0.03em] tabular-nums">
                {priceRange}
                <span className="ml-2 text-sm font-normal tracking-normal text-muted-foreground">
                  per session
                </span>
              </p>
            )}

            {(photographer.deposit_policy || photographer.payment_terms) && (
              <div className="mt-4 space-y-2 text-sm">
                {photographer.deposit_policy && (
                  <p className="inline-flex items-center gap-2 rounded-full bg-accent px-3.5 py-1.5 font-medium text-accent-foreground">
                    <CreditCard className="size-4" />
                    {DEPOSIT_POLICY_LABELS[photographer.deposit_policy]}
                  </p>
                )}
                {photographer.payment_terms && (
                  <p className="text-muted-foreground">
                    {photographer.payment_terms}
                  </p>
                )}
              </div>
            )}

            {photographer.bio && (
              <p className="mt-6 max-w-prose text-base leading-relaxed">
                {photographer.bio}
              </p>
            )}

            {hasLinks && (
              <div className="mt-6 flex flex-wrap gap-2 text-sm">
                {instagramHref && (
                  <a
                    href={instagramHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3.5 py-1.5 font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
                  >
                    <AtSign className="size-4" />
                    Instagram
                  </a>
                )}
                {socialLinks.map((link, i) => (
                  <a
                    key={i}
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3.5 py-1.5 font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
                  >
                    <LinkIcon className="size-4" />
                    {link.label}
                  </a>
                ))}
              </div>
            )}

            {hasWeekly && (
              <div className="mt-6 border-t pt-5">
                <p className="mb-3 text-sm font-medium">Usually available</p>
                <div className="flex flex-wrap gap-2 text-xs">
                  {WEEKDAYS.filter(
                    (day) => photographer.weekly_availability?.[day]
                  ).map((day) => {
                    const range = photographer.weekly_availability![day]!
                    return (
                      <span
                        key={day}
                        className="rounded-full bg-muted px-3 py-1.5 font-medium tabular-nums text-muted-foreground"
                      >
                        {DAY_LABELS[day]} {range.start} - {range.end}
                      </span>
                    )
                  })}
                </div>
              </div>
            )}
          </section>

          {photos.length > 0 && (
            <section aria-label="Portfolio" className="grid grid-cols-3 gap-3">
              {photos.map((photo, i) => (
                <div
                  key={photo.id}
                  className={cn(
                    'relative aspect-square w-full overflow-hidden rounded-3xl bg-muted',
                    i === 0 && photos.length > 2 && 'col-span-2 row-span-2'
                  )}
                >
                  <PortfolioImage
                    src={photo.image_url}
                    alt={photo.caption ?? 'Portfolio photo'}
                    fill
                    sizes={
                      i === 0
                        ? '(min-width: 1024px) 40vw, 66vw'
                        : '(min-width: 1024px) 20vw, 33vw'
                    }
                    className="object-cover transition-transform duration-700 ease-out hover:scale-105"
                  />
                </div>
              ))}
            </section>
          )}
        </div>

        <section className="space-y-4 lg:sticky lg:top-36">
          <h2 className="font-heading text-2xl font-semibold tracking-tight">
            Book a session
          </h2>
          {justBooked && (
            <Alert>
              <AlertDescription>
                Payment received. Finalizing your booking, it will appear in
                your bookings shortly.
              </AlertDescription>
            </Alert>
          )}
          <BookingWidget
            photographerId={photographer.id}
            photographerName={photographer.display_name ?? 'this photographer'}
            basePrice={photographer.base_price}
            priceLabel={priceRange}
            depositPolicy={photographer.deposit_policy}
            paymentTerms={photographer.payment_terms}
            paymentsEnabled={paymentsEnabled}
            paymentLink={normalizeHttpUrl(photographer.payment_link)}
            initialSlots={slots}
          />
        </section>
      </div>
    </>
  )
}
