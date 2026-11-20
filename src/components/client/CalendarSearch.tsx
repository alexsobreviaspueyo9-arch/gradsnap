'use client'

import { useEffect, useMemo, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { CalendarCheck, CalendarX2, Clock, MapPin, Star } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import {
  AvailabilityCalendar,
  type CalendarEvent,
} from '@/components/availability-calendar'
import { buttonVariants } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import {
  formatDateHeading,
  isoDateToLocalDate,
  localDateToISODate,
  todayISODate,
} from '@/lib/date'
import { SlotPicker, slotTimeLabel } from '@/components/client/slot-picker'
import { selectionQuery, type BookingViewer } from '@/lib/guest-booking'
import { MessagePhotographerButton } from '@/components/client/message-photographer-button'
import { listTotalPrice } from '@/lib/fees'
import {
  EMPTY_CARD_STATS,
  RESPONSE_BADGE_LABEL,
  fromPrice,
  nextSlotByPhotographer,
  responseBadge,
  styleTags,
  type CardStats,
} from '@/lib/photographer-cards'
import { useDashboardBase, usePreviewMode } from '@/components/preview/preview-mode'
import {
  PHOTOGRAPHER_SPECIALTIES,
  type AvailabilitySlot,
  type PhotographerProfile,
} from '@/types/database'

export type SlotWithPhotographer = AvailabilitySlot & {
  photographer: Pick<
    PhotographerProfile,
    | 'id'
    | 'display_name'
    | 'city'
    | 'base_price'
    | 'price_max'
    | 'specialty'
    | 'specialty_other'
    | 'payment_method'
    | 'requires_deposit'
    | 'payment_terms'
    | 'payment_link'
  >
}

type Photographer = SlotWithPhotographer['photographer']

const PANEL = 'rounded-3xl bg-card p-5 sm:p-6'
const FIELD =
  'h-11 w-full rounded-lg border border-input bg-card px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50'
const CHIP = 'inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs font-medium'

function formatSlotShort(slot: { date: string; start_time: string }): string {
  const day = isoDateToLocalDate(slot.date).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })
  return `${day} · ${slot.start_time.slice(0, 5)}`
}

// One photographer: cover photo first, then the facts that help choose.
function PhotographerCard({
  photographer,
  stats,
  profileHref,
  paymentsEnabled,
  viewer,
  daySlots,
  nextSlot,
  onDate,
  selectedSlotId,
  onSelectSlot,
}: {
  photographer: Photographer
  stats: CardStats
  profileHref: string
  paymentsEnabled: boolean
  viewer: BookingViewer
  daySlots: SlotWithPhotographer[]
  nextSlot: SlotWithPhotographer | null
  onDate: string | null
  selectedSlotId: string | null
  onSelectSlot: (id: string) => void
}) {
  const name = photographer.display_name ?? 'Photographer'
  const price = fromPrice(photographer.base_price, stats.minPackagePrice)
  const badge = responseBadge(stats.responseHours)
  const tags = styleTags(photographer.specialty, photographer.specialty_other)
  const selectedSlot = daySlots.find((s) => s.id === selectedSlotId) ?? null
  const bookHref = selectedSlot
    ? `${profileHref}${selectionQuery({ date: selectedSlot.date, slotId: selectedSlot.id })}`
    : null

  return (
    <article className="overflow-hidden rounded-3xl bg-card">
      <Link href={profileHref} className="block" tabIndex={-1} aria-hidden>
        <div className="relative aspect-[16/9] w-full bg-muted">
          {stats.coverImageUrl ? (
            <Image
              src={stats.coverImageUrl}
              alt=""
              fill
              sizes="(min-width: 1024px) 40vw, 100vw"
              className="object-cover"
            />
          ) : (
            <span className="flex h-full items-center justify-center text-4xl font-semibold text-muted-foreground">
              {name.charAt(0).toUpperCase()}
            </span>
          )}
        </div>
      </Link>
      <div className="space-y-3 p-5 sm:p-6">
        {onDate && (
          <p className={cn(CHIP, 'bg-success-fill text-success')}>
            <CalendarCheck className="size-3.5" aria-hidden />
            Available on your date
          </p>
        )}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <Link
              href={profileHref}
              className="block truncate text-lg font-semibold tracking-tight hover:underline"
            >
              {name}
            </Link>
            <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
              {photographer.city && (
                <span className="inline-flex items-center gap-1">
                  <MapPin className="size-3.5" aria-hidden />
                  {photographer.city}
                </span>
              )}
              {stats.reviewCount > 0 && stats.ratingAvg != null && (
                <span className="inline-flex items-center gap-1 text-foreground">
                  <Star className="size-3.5 fill-current" aria-hidden />
                  {stats.ratingAvg.toFixed(1)}
                  <span className="text-muted-foreground">
                    ({stats.reviewCount} review{stats.reviewCount === 1 ? '' : 's'})
                  </span>
                </span>
              )}
            </p>
          </div>
          {price != null && (
            <p className="shrink-0 text-right font-semibold tabular-nums">
              from ${paymentsEnabled ? listTotalPrice(price) : price}
            </p>
          )}
        </div>

        {(tags.length > 0 || badge) && (
          <div className="flex flex-wrap gap-2">
            {tags.map((tag) => (
              <span key={tag} className={CHIP}>
                {tag}
              </span>
            ))}
            {badge && (
              <span className={CHIP}>
                <Clock className="size-3.5" aria-hidden />
                {RESPONSE_BADGE_LABEL[badge]}
              </span>
            )}
          </div>
        )}

        {onDate ? (
          <>
            <SlotPicker
              label={`Available times with ${name}`}
              slots={daySlots}
              selectedId={selectedSlot?.id ?? null}
              onSelect={onSelectSlot}
              disabled={false}
            />
            {bookHref ? (
              <Link
                href={bookHref}
                className={cn(buttonVariants({ size: 'lg' }), 'h-12 w-full text-base')}
              >
                {viewer === 'photographer' ? 'View' : 'Book'} {slotTimeLabel(selectedSlot!)}
              </Link>
            ) : (
              <p className="text-sm text-muted-foreground">Choose a time to continue.</p>
            )}
          </>
        ) : (
          <p className="text-sm text-muted-foreground">
            {nextSlot ? `Next available: ${formatSlotShort(nextSlot)}` : 'No open times right now'}
          </p>
        )}

        <div className="flex flex-wrap gap-2">
          {!onDate && (
            <Link
              href={profileHref}
              className={cn(buttonVariants({ variant: 'secondary' }), 'h-11 px-5')}
            >
              See availability
            </Link>
          )}
          {viewer === 'client' && <MessagePhotographerButton photographerId={photographer.id} />}
        </div>
      </div>
    </article>
  )
}

// Date-first search: "When is your graduation?" narrows the list to
// photographers free that day. Booking happens on the profile, in steps.
export function CalendarSearch({
  initialSlots,
  paymentsEnabled,
  viewer = 'client',
  photographersPath,
  cardStats = {},
  initialDate = null,
}: {
  initialSlots: SlotWithPhotographer[]
  paymentsEnabled: boolean
  viewer?: BookingViewer
  /** Where photographer names link; defaults to the client dashboard. */
  photographersPath?: string
  cardStats?: Record<string, CardStats>
  /** From ?date= (e.g. the landing page's date picker). */
  initialDate?: string | null
}) {
  const supabase = createClient()
  const isPreview = usePreviewMode()
  const clientBase = useDashboardBase('client')
  const profilesPath = photographersPath ?? `${clientBase}/photographers`
  const [slots, setSlots] = useState(initialSlots)
  const [cityFilter, setCityFilter] = useState('')
  const [maxPriceFilter, setMaxPriceFilter] = useState('')
  const [specialtyFilter, setSpecialtyFilter] = useState('')
  const [selectedDateISO, setSelectedDateISO] = useState<string | null>(initialDate)
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null)

  // Live-remove a slot the moment anyone books or deletes it, so a client
  // never tries to book something another client just took.
  useEffect(() => {
    if (isPreview || viewer !== 'client') return
    const channel = supabase
      .channel('client-search-availability')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'availability_slots' },
        (payload) => {
          if (payload.eventType === 'DELETE') {
            const oldId = (payload.old as { id?: string }).id
            setSlots((prev) => prev.filter((s) => s.id !== oldId))
          } else if (payload.eventType === 'UPDATE') {
            const updated = payload.new as AvailabilitySlot
            if (updated.is_booked) {
              setSlots((prev) => prev.filter((s) => s.id !== updated.id))
            }
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase, isPreview, viewer])

  const statsFor = (id: string): CardStats => cardStats[id] ?? EMPTY_CARD_STATS

  const filteredSlots = useMemo(() => {
    const maxPrice =
      maxPriceFilter.trim() === '' ? null : Number.parseFloat(maxPriceFilter)
    const city = cityFilter.trim().toLowerCase()

    return slots.filter((slot) => {
      const p = slot.photographer
      if (city && !(p.city ?? '').toLowerCase().includes(city)) return false
      const price = fromPrice(p.base_price, cardStats[p.id]?.minPackagePrice ?? null)
      if (maxPrice != null && price != null && price > maxPrice) return false
      if (specialtyFilter) {
        const style = p.specialty === 'Other' ? p.specialty_other : p.specialty
        if (style !== specialtyFilter) return false
      }
      return true
    })
  }, [slots, cityFilter, maxPriceFilter, specialtyFilter, cardStats])

  const photographers = useMemo(() => {
    const byId = new Map<string, Photographer>()
    for (const slot of filteredSlots) byId.set(slot.photographer.id, slot.photographer)
    return [...byId.values()]
  }, [filteredSlots])

  const nextSlots = useMemo(() => nextSlotByPhotographer(filteredSlots), [filteredSlots])

  const daySlots = selectedDateISO
    ? filteredSlots.filter((s) => s.date === selectedDateISO)
    : []
  const shown = selectedDateISO
    ? photographers.filter((p) => daySlots.some((s) => s.photographer.id === p.id))
    : [...photographers].sort((a, b) => {
        const na = nextSlots.get(a.id)
        const nb = nextSlots.get(b.id)
        return `${na?.date} ${na?.start_time}`.localeCompare(`${nb?.date} ${nb?.start_time}`)
      })

  const events: CalendarEvent[] = [...new Set(filteredSlots.map((s) => s.date))].map((date) => ({
    id: date,
    title: 'Available',
    start: isoDateToLocalDate(date),
    end: isoDateToLocalDate(date),
  }))

  function chooseDate(iso: string | null) {
    setSelectedDateISO(iso)
    setSelectedSlotId(null)
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:items-start">
        <div className="space-y-4">
          <div className={cn(PANEL, 'space-y-4')}>
            <div className="space-y-2">
              <Label htmlFor="graduationDate" className="text-base font-semibold">
                When is your graduation?
              </Label>
              <div className="flex gap-2">
                <Input
                  id="graduationDate"
                  type="date"
                  min={todayISODate()}
                  value={selectedDateISO ?? ''}
                  onChange={(e) => chooseDate(e.target.value || null)}
                />
                {selectedDateISO && (
                  <button
                    type="button"
                    onClick={() => chooseDate(null)}
                    className={cn(buttonVariants({ variant: 'ghost' }), 'h-11 shrink-0 px-4')}
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="cityFilter">Location</Label>
                <Input
                  id="cityFilter"
                  placeholder="e.g. Richmond"
                  value={cityFilter}
                  onChange={(e) => setCityFilter(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="maxPriceFilter">Max price ($)</Label>
                <Input
                  id="maxPriceFilter"
                  type="number"
                  min="0"
                  placeholder="Any"
                  value={maxPriceFilter}
                  onChange={(e) => setMaxPriceFilter(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="specialtyFilter">Style</Label>
                <select
                  id="specialtyFilter"
                  value={specialtyFilter}
                  onChange={(e) => setSpecialtyFilter(e.target.value)}
                  className={FIELD}
                >
                  <option value="">Any style</option>
                  {PHOTOGRAPHER_SPECIALTIES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className={PANEL}>
            <AvailabilityCalendar
              events={events}
              selectedDate={selectedDateISO ? isoDateToLocalDate(selectedDateISO) : undefined}
              onSelectDate={(date) => chooseDate(date ? localDateToISODate(date) : null)}
            />
          </div>
        </div>

        <div className="space-y-4">
          <h2 className="text-2xl font-semibold tracking-tight" aria-live="polite">
            {selectedDateISO
              ? `Available on ${formatDateHeading(selectedDateISO)}`
              : 'All photographers'}
          </h2>

          {shown.length === 0 ? (
            <div className="flex flex-col items-center gap-3 rounded-3xl border border-dashed border-border px-6 py-12 text-center">
              <span className="flex size-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
                <CalendarX2 className="size-6" strokeWidth={1.75} aria-hidden />
              </span>
              <p className="max-w-xs text-sm text-muted-foreground">
                {selectedDateISO
                  ? 'No photographers match your filters on this date. Try a nearby date or adjust your filters.'
                  : 'No photographers match your filters.'}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {shown.map((photographer) => (
                <PhotographerCard
                  key={photographer.id}
                  photographer={photographer}
                  stats={statsFor(photographer.id)}
                  profileHref={`${profilesPath}/${photographer.id}`}
                  paymentsEnabled={paymentsEnabled}
                  viewer={viewer}
                  daySlots={daySlots.filter((s) => s.photographer.id === photographer.id)}
                  nextSlot={nextSlots.get(photographer.id) ?? null}
                  onDate={selectedDateISO}
                  selectedSlotId={selectedSlotId}
                  onSelectSlot={setSelectedSlotId}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
