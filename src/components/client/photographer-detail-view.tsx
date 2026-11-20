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
import { formatAllInPriceRange, formatPriceRange } from '@/lib/price'
import { paymentSummary, type PaymentSetup } from '@/lib/payment'
import { BookingWidget, type PackageOption } from '@/components/client/BookingWidget'
import { FavoriteButton } from '@/components/client/favorite-button'
import { ShareProfileButton } from '@/components/client/share-profile-button'
import { ProfileReviews, type ProfileReview } from '@/components/client/profile-reviews'
import { spotById } from '@/lib/campus-spots'
import { EMPTY_CARD_STATS, RESPONSE_BADGE_LABEL, fromPrice, responseBadge, type CardStats } from '@/lib/photographer-cards'
import { MessagePhotographerButton } from '@/components/client/message-photographer-button'
import { PilotNote } from '@/components/brand/pilot-note'
import { DASHBOARD_BASE } from '@/lib/routing'
import type { BookingViewer } from '@/lib/guest-booking'
import {
  WEEKDAYS,
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

const PANEL = 'rounded-3xl bg-card p-6 sm:p-8'

// What a guest may see (public_photographers RPC); payment details only reach
// signed-in clients.
export type PublicPhotographer = Pick<
  PhotographerProfile,
  | 'id'
  | 'display_name'
  | 'bio'
  | 'city'
  | 'specialty'
  | 'specialty_other'
  | 'base_price'
  | 'price_max'
  | 'session_duration_minutes'
  | 'instagram_url'
  | 'social_links'
  | 'weekly_availability'
>
type DetailPhotographer = PublicPhotographer &
  Partial<Pick<PhotographerProfile, 'payment_method' | 'requires_deposit' | 'payment_terms' | 'payment_link'>>

export function PhotographerDetailView({
  photographer,
  photos,
  slots,
  justBooked,
  paymentsEnabled,
  basePath = DASHBOARD_BASE.client,
  viewer = 'client',
  initialDate = null,
  initialSlotId = null,
  initialPackageId = null,
  refCode = null,
  packages = [],
  reviews = [],
  stats = EMPTY_CARD_STATS,
  isFavorite = null,
}: {
  photographer: DetailPhotographer
  photos: Pick<PortfolioPhoto, 'id' | 'image_url' | 'caption'>[]
  slots: AvailabilitySlot[]
  justBooked: boolean
  paymentsEnabled: boolean
  /** Where in-app links point; the admin preview passes its own, guests ''. */
  basePath?: string
  viewer?: BookingViewer
  initialDate?: string | null
  initialSlotId?: string | null
  initialPackageId?: string | null
  refCode?: string | null
  packages?: PackageOption[]
  reviews?: ProfileReview[]
  stats?: CardStats
  /** Signed-in clients only: whether this photographer is saved. */
  isFavorite?: boolean | null
}) {
  const name = photographer.display_name ?? 'Photographer'
  const style =
    photographer.specialty === 'Other'
      ? photographer.specialty_other
      : photographer.specialty
  const lowest = fromPrice(photographer.base_price, stats.minPackagePrice)
  const priceRange =
    stats.minPackagePrice != null
      ? (paymentsEnabled ? formatAllInPriceRange : formatPriceRange)(lowest, null)
      : (paymentsEnabled ? formatAllInPriceRange : formatPriceRange)(
          photographer.base_price,
          photographer.price_max
        )
  const badge = responseBadge(stats.responseHours)
  const instagramHref = normalizeHttpUrl(photographer.instagram_url)
  const socialLinks = (photographer.social_links ?? []).flatMap((link) => {
    const href = normalizeHttpUrl(link.url)
    return href ? [{ label: link.label, href }] : []
  })
  const hasLinks = instagramHref !== null || socialLinks.length > 0
  const payment: PaymentSetup = {
    method: photographer.payment_method ?? null,
    requiresDeposit: photographer.requires_deposit ?? null,
  }
  const paymentLabel = paymentSummary(payment)
  const hasWeekly = Object.keys(photographer.weekly_availability ?? {}).length > 0

  return (
    <>
      <Link
        href={`${basePath}/photographers`}
        className="mb-4 inline-flex min-h-11 items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
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
                className="flex size-16 shrink-0 items-center justify-center rounded-full bg-muted text-2xl font-semibold text-foreground"
              >
                {name.charAt(0).toUpperCase()}
              </span>
              <div className="min-w-0">
                <h1 className="text-3xl leading-tight font-semibold tracking-[-0.03em] sm:text-4xl">
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
                <div className="mt-4 flex flex-wrap gap-2">
                  {viewer === 'client' && <MessagePhotographerButton photographerId={photographer.id} />}
                  {viewer === 'client' && isFavorite !== null && (
                    <FavoriteButton photographerId={photographer.id} initialSaved={isFavorite} />
                  )}
                  <ShareProfileButton photographerId={photographer.id} name={name} />
                </div>
                {(stats.reviewCount > 0 || badge) && (
                  <p className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                    {stats.reviewCount > 0 && stats.ratingAvg != null && (
                      <span className="font-medium text-foreground">
                        ★ {stats.ratingAvg.toFixed(1)} ({stats.reviewCount} review
                        {stats.reviewCount === 1 ? '' : 's'})
                      </span>
                    )}
                    {badge && <span>{RESPONSE_BADGE_LABEL[badge]}</span>}
                  </p>
                )}
              </div>
            </div>

            {priceRange && (
              <p className="mt-6 text-4xl font-semibold tracking-[-0.03em] tabular-nums">
                {priceRange}
                <span className="ml-2 text-sm font-normal tracking-normal text-muted-foreground">
                  {stats.minPackagePrice != null ? 'lowest package' : 'per session'}
                </span>
              </p>
            )}
            {priceRange && paymentsEnabled && (
              <p className="mt-1 text-sm text-muted-foreground">Includes GradSnap service fee</p>
            )}
            {priceRange && !paymentsEnabled && <PilotNote className="mt-2" />}

            {(paymentLabel || photographer.payment_terms) && (
              <div className="mt-4 space-y-2 text-sm">
                {paymentLabel && (
                  <p className="inline-flex items-center gap-2 rounded-full bg-muted px-3.5 py-1.5 font-medium">
                    <CreditCard className="size-4" />
                    {paymentLabel}
                  </p>
                )}
                {photographer.payment_terms && (
                  <div className="rounded-2xl bg-muted p-4">
                    <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                      Payment and cancellation terms · Set by the photographer
                    </p>
                    <p className="mt-1 whitespace-pre-line">{photographer.payment_terms}</p>
                  </div>
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
                    className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3.5 py-1.5 font-medium transition-colors hover:bg-secondary"
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
                    className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3.5 py-1.5 font-medium transition-colors hover:bg-secondary"
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
                    alt={photo.caption ?? `Graduation photo by ${name}`}
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
          {packages.length > 0 && (
            <section aria-labelledby="packages-heading" className={PANEL}>
              <h2 id="packages-heading" className="text-xl font-semibold tracking-tight">
                Packages
              </h2>
              <ul className="mt-4 space-y-3">
                {packages.map((pkg) => (
                  <li key={pkg.id} className="flex items-start justify-between gap-4 rounded-2xl bg-muted p-4">
                    <div>
                      <p className="font-semibold">{pkg.name}</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {pkg.duration_minutes} min · {pkg.included_photos} edited photos · delivered in{' '}
                        {pkg.delivery_days} day{pkg.delivery_days === 1 ? '' : 's'}
                      </p>
                    </div>
                    <p className="shrink-0 font-semibold tabular-nums">${pkg.price}</p>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {stats.photoSpots.length > 0 && (
            <section aria-labelledby="spots-heading" className={PANEL}>
              <h2 id="spots-heading" className="text-xl font-semibold tracking-tight">
                Photo spots
              </h2>
              <ul className="mt-3 flex flex-wrap gap-2">
                {stats.photoSpots.map((id) => {
                  const spot = spotById(id)
                  return spot ? (
                    <li key={id} className="rounded-full bg-muted px-3.5 py-1.5 text-sm font-medium">
                      {spot.name}
                    </li>
                  ) : null
                })}
              </ul>
            </section>
          )}

          <ProfileReviews reviews={reviews} ratingAvg={stats.ratingAvg} reviewCount={stats.reviewCount} />
        </div>

        <section className="space-y-4 lg:sticky lg:top-36">
          <h2 className="text-2xl font-semibold tracking-tight">
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
            payment={payment}
            paymentTerms={photographer.payment_terms ?? null}
            paymentsEnabled={paymentsEnabled}
            paymentLink={normalizeHttpUrl(photographer.payment_link)}
            initialSlots={slots}
            viewer={viewer}
            initialDate={initialDate}
            initialSlotId={initialSlotId}
            initialPackageId={initialPackageId}
            refCode={refCode}
            packages={packages}
          />
        </section>
      </div>
    </>
  )
}
