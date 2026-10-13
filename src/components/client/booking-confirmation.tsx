import Link from 'next/link'
import {
  CalendarDays,
  CheckCircle2,
  Clock,
  CreditCard,
  ExternalLink,
  User,
} from 'lucide-react'
import { Button, buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { formatDateHeading } from '@/lib/date'
import { normalizeHttpUrl } from '@/lib/url'
import type { DepositPolicy } from '@/types/database'

export type BookingSummary = {
  photographerName: string
  date: string
  startTime: string
  endTime: string
  priceLabel: string | null
  depositPolicy: DepositPolicy | null
  paymentTerms: string | null
  paymentLink: string | null
}

type NextStep = { text: string; payLabel: string | null }

function nextStepFor(
  depositPolicy: DepositPolicy | null,
  hasPaymentLink: boolean
): NextStep {
  if (depositPolicy === 'cash_on_session') {
    return {
      text: "No deposit needed. You'll pay the full amount in cash after the session.",
      payLabel: null,
    }
  }
  if (depositPolicy === 'deposit_50') {
    return hasPaymentLink
      ? {
          text: 'Pay the 50% deposit to secure your session. The rest is paid in cash after the session.',
          payLabel: 'Pay deposit',
        }
      : {
          text: 'The photographer will send you instructions to pay the 50% deposit.',
          payLabel: null,
        }
  }
  return hasPaymentLink
    ? {
        text: "Complete the payment using the photographer's payment link.",
        payLabel: 'Complete payment',
      }
    : { text: 'The photographer will contact you about payment.', payLabel: null }
}

function SummaryRow({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof User
  label: string
  value: string
}) {
  return (
    <div className="flex items-center gap-3 py-3">
      <Icon className="size-4 shrink-0 text-muted-foreground" />
      <dt className="w-24 shrink-0 text-sm text-muted-foreground">{label}</dt>
      <dd className="min-w-0 text-sm font-medium">{value}</dd>
    </div>
  )
}

// Stays mounted after the client opens the payment link: the link opens in a
// new tab and nothing on this page clears the confirmation except the
// "Book another session" button.
export function BookingConfirmation({
  booking,
  onBookAnother,
}: {
  booking: BookingSummary
  onBookAnother: () => void
}) {
  const paymentHref = normalizeHttpUrl(booking.paymentLink)
  const nextStep = nextStepFor(booking.depositPolicy, paymentHref !== null)
  const time = `${booking.startTime.slice(0, 5)} - ${booking.endTime.slice(0, 5)}`

  return (
    <section
      aria-live="polite"
      className="rounded-3xl bg-card p-6 sm:p-8"
    >
      <div className="flex items-center gap-3">
        <span className="flex size-12 items-center justify-center rounded-2xl bg-success-fill text-success">
          <CheckCircle2 className="size-6" strokeWidth={1.75} />
        </span>
        <div>
          <h3 className="text-xl font-semibold tracking-tight">
            Booking requested
          </h3>
          <p className="text-sm text-muted-foreground">
            The photographer will confirm it shortly.
          </p>
        </div>
      </div>

      <dl className="mt-6 divide-y divide-border">
        <SummaryRow icon={User} label="Photographer" value={booking.photographerName} />
        <SummaryRow icon={CalendarDays} label="Date" value={formatDateHeading(booking.date)} />
        <SummaryRow icon={Clock} label="Time" value={time} />
        <SummaryRow
          icon={CreditCard}
          label="Price"
          value={booking.priceLabel ?? 'Agreed with the photographer'}
        />
      </dl>

      <div className="mt-6 rounded-2xl bg-muted/60 p-4">
        <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
          Next step
        </p>
        <p className="mt-1 text-sm">{nextStep.text}</p>
        {booking.paymentTerms && (
          <p className="mt-2 text-sm text-muted-foreground italic">
            &ldquo;{booking.paymentTerms}&rdquo;
          </p>
        )}
        {nextStep.payLabel && paymentHref && (
          <a
            href={paymentHref}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(buttonVariants({ size: 'lg' }), 'mt-4 h-11 w-full gap-2')}
          >
            {nextStep.payLabel}
            <ExternalLink className="size-4" />
          </a>
        )}
      </div>

      <div className="mt-6 flex flex-col gap-2 sm:flex-row">
        <Link
          href="/dashboard/client"
          className={cn(buttonVariants({ variant: 'outline' }), 'h-10 flex-1')}
        >
          Go to my dashboard
        </Link>
        <Button type="button" variant="ghost" className="h-10 flex-1" onClick={onBookAnother}>
          Book another session
        </Button>
      </div>
    </section>
  )
}
