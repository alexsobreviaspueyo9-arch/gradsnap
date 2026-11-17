import Link from 'next/link'
import { formatZonedDateTime, zonedDateTime } from '@/lib/date'
import { feeBreakdown, paymentSchedule } from '@/lib/fees'
import { CLIENT_REFUND_TIERS, freeCancellationDeadline } from '@/lib/cancellation-policy'
import { formatMoney } from '@/lib/price'
import { CANCELLATION_POLICY_PATH } from '@/lib/site'

const HOUR_MS = 3_600_000
const LINK = 'font-medium text-foreground underline underline-offset-4'

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-medium tabular-nums">{value}</dd>
    </div>
  )
}

// Checkout and confirmation summary when PAYMENTS_ENABLED=true: exact total,
// breakdown, payment schedule and the free-cancellation date. Only dates in
// New York time and whole-minute values, so server and browser render alike.
export function FeeSummary({
  basePrice,
  date,
  startTime,
  bookedAt,
}: {
  basePrice: number
  date: string
  startTime: string
  /** When the booking was (or will be) made; defaults to now. */
  bookedAt?: Date
}) {
  const breakdown = feeBreakdown(basePrice)
  const start = zonedDateTime(date, startTime)
  const booked = bookedAt ?? new Date()
  const { balanceChargeAt } = paymentSchedule(start, booked)
  const deadline = freeCancellationDeadline(start, booked)
  const tierEnd = start.getTime() - CLIENT_REFUND_TIERS[0].minHoursBefore * HOUR_MS
  const balanceNow = balanceChargeAt.getTime() <= booked.getTime()

  const cancellation =
    deadline === null
      ? 'This session is less than a week away: cancelling refunds 50% of the session price at most.'
      : deadline.getTime() === tierEnd
        ? `Free cancellation until ${formatZonedDateTime(deadline)}.`
        : 'Free cancellation for 24 hours after you book.'

  return (
    <div className="space-y-3 rounded-2xl bg-muted p-4 text-sm">
      <div className="flex items-baseline justify-between gap-4">
        <div>
          <p className="font-semibold">Total</p>
          <p className="text-xs text-muted-foreground">Includes GradSnap service fee</p>
        </div>
        <p className="text-lg font-semibold tabular-nums">{formatMoney(breakdown.total)}</p>
      </div>

      <details className="group">
        <summary className="flex min-h-11 cursor-pointer items-center font-medium">
          Price breakdown and payments
        </summary>
        <dl className="space-y-2 pt-1">
          <Row label="Session" value={formatMoney(breakdown.sessionPrice)} />
          <Row label="GradSnap service fee" value={formatMoney(breakdown.clientFee)} />
          <Row label="Due when you book (50% + fee)" value={formatMoney(breakdown.dueAtBooking)} />
          <Row
            label={
              balanceNow
                ? 'Other 50%, charged when you book'
                : `Other 50%, charged ${formatZonedDateTime(balanceChargeAt)}`
            }
            value={formatMoney(breakdown.balance)}
          />
        </dl>
      </details>

      <p className="font-medium">{cancellation}</p>
      <p className="text-muted-foreground">
        Refunds depend on when you cancel; the service fee is refunded only in the first 24 hours
        or if the photographer cancels.{' '}
        <Link href={CANCELLATION_POLICY_PATH} className={LINK}>
          Cancellation policy
        </Link>
      </p>
    </div>
  )
}
