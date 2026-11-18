import Link from 'next/link'
import { Button, buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { slotTimeLabel } from '@/components/client/slot-picker'
import { guestBookingNext, guestRegisterHref, type BookingViewer } from '@/lib/guest-booking'
import type { AvailabilitySlot } from '@/types/database'

// The one primary action under a chosen time. Choosing a time never books:
// clients press this; guests go to sign up and come back with it preselected.
export function BookButton({
  viewer,
  photographerId,
  slot,
  isBooking,
  busyLabel,
  onBook,
  className,
  refCode = null,
}: {
  viewer: BookingViewer
  photographerId: string
  slot: Pick<AvailabilitySlot, 'id' | 'date' | 'start_time' | 'end_time'>
  isBooking: boolean
  busyLabel: string
  onBook: () => void
  className?: string
  /** Photographer's personal-link code, kept through sign-up. */
  refCode?: string | null
}) {
  const label = `Book ${slotTimeLabel(slot)}`
  const classes = cn('h-12 w-full text-base', className)

  if (viewer === 'photographer') {
    return (
      <div className={cn('space-y-2', className)}>
        <Button type="button" size="lg" className="h-12 w-full text-base" disabled>
          {label}
        </Button>
        <p className="text-sm text-muted-foreground">Photographer accounts cannot book sessions.</p>
      </div>
    )
  }

  if (viewer === 'guest') {
    return (
      <Link
        href={guestRegisterHref(guestBookingNext(photographerId, slot.date, slot.id, refCode))}
        className={cn(buttonVariants({ size: 'lg' }), classes)}
      >
        {label}
      </Link>
    )
  }

  return (
    <Button type="button" size="lg" className={classes} disabled={isBooking} onClick={onBook}>
      {isBooking ? busyLabel : label}
    </Button>
  )
}
