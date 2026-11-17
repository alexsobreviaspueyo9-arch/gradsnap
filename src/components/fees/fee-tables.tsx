import {
  CLIENT_REFUND_TIERS,
  LATE_REFUND_RATE,
  PHOTOGRAPHER_LATE_PENALTY,
  PHOTOGRAPHER_PENALTIES,
} from '@/lib/cancellation-policy'
import {
  BALANCE_CHARGE_HOURS_BEFORE,
  CLIENT_FEE_MINIMUM,
  CLIENT_FEE_RATE,
  COMMISSION_RATE,
  DEPOSIT_RATE,
  PAYOUT_HOURS_AFTER,
  feeBreakdown,
} from '@/lib/fees'
import { formatMoney } from '@/lib/price'

// Shared copy for /tarifas, /politica-de-cancelacion and /fotografos (only
// rendered when PAYMENTS_ENABLED=true). Numbers come from lib/fees.ts and
// lib/cancellation-policy.ts so the pages can't drift from the code.

const TABLE = 'w-full text-left text-sm'
const CELL = 'border-t border-border px-4 py-3'
const HEAD = 'px-4 py-3 font-medium text-muted-foreground'

export const percent = (rate: number): string => `${Math.round(rate * 100)}%`

// Labels for the shared tiers (14d / 7d / 72h boundaries).
const TIER_LABELS = ['14 days or more before', '7 to 13 days before', '72 hours to 6 days before']
const LATE_LABEL = 'Less than 72 hours before, or no-show'

export const EXAMPLE_PRICE = 200

export function ClientRefundTable() {
  return (
    <div className="overflow-x-auto rounded-3xl bg-card">
      <table className={TABLE}>
        <caption className="sr-only">Refund when a client cancels</caption>
        <thead>
          <tr>
            <th scope="col" className={HEAD}>Client cancels</th>
            <th scope="col" className={HEAD}>Session price refunded</th>
            <th scope="col" className={HEAD}>Service fee</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className={CELL}>Within 24 hours of booking, session 7+ days away</td>
            <td className={CELL}>100%</td>
            <td className={CELL}>Refunded</td>
          </tr>
          {CLIENT_REFUND_TIERS.map((tier, i) => (
            <tr key={tier.minHoursBefore}>
              <td className={CELL}>{TIER_LABELS[i]}</td>
              <td className={CELL}>{percent(tier.rate)}</td>
              <td className={CELL}>Not refunded</td>
            </tr>
          ))}
          <tr>
            <td className={CELL}>{LATE_LABEL}</td>
            <td className={CELL}>{percent(LATE_REFUND_RATE)}</td>
            <td className={CELL}>Not refunded</td>
          </tr>
          <tr>
            <td className={CELL}>The photographer cancels</td>
            <td className={CELL}>100%</td>
            <td className={CELL}>Refunded</td>
          </tr>
        </tbody>
      </table>
    </div>
  )
}

export function PhotographerPenaltyTable() {
  return (
    <div className="overflow-x-auto rounded-3xl bg-card">
      <table className={TABLE}>
        <caption className="sr-only">Penalty when a photographer cancels</caption>
        <thead>
          <tr>
            <th scope="col" className={HEAD}>Photographer cancels</th>
            <th scope="col" className={HEAD}>Penalty</th>
          </tr>
        </thead>
        <tbody>
          {PHOTOGRAPHER_PENALTIES.map((tier, i) => (
            <tr key={tier.minHoursBefore}>
              <td className={CELL}>{TIER_LABELS[i]}</td>
              <td className={CELL}>{tier.amount === 0 ? 'None' : formatMoney(tier.amount)}</td>
            </tr>
          ))}
          <tr>
            <td className={CELL}>{LATE_LABEL}</td>
            <td className={CELL}>{formatMoney(PHOTOGRAPHER_LATE_PENALTY)}</td>
          </tr>
        </tbody>
      </table>
      <p className="border-t border-border px-4 py-3 text-sm text-muted-foreground">
        Whenever a photographer cancels, the client gets everything back, service fee included.
      </p>
    </div>
  )
}

export function ClientFeeFacts() {
  const example = feeBreakdown(EXAMPLE_PRICE)
  return (
    <ul className="list-disc space-y-2 pl-5 text-sm leading-relaxed">
      <li>
        Clients pay a GradSnap service fee of {percent(CLIENT_FEE_RATE)} of the session price, at
        least {formatMoney(CLIENT_FEE_MINIMUM)}. Prices on GradSnap already include it.
      </li>
      <li>
        At booking: {percent(DEPOSIT_RATE)} of the session price plus the whole fee. The other{' '}
        {percent(1 - DEPOSIT_RATE)} is charged automatically {BALANCE_CHARGE_HOURS_BEFORE} hours
        before the session.
      </li>
      <li>
        Example: a {formatMoney(example.sessionPrice)} session costs {formatMoney(example.total)}{' '}
        in total ({formatMoney(example.clientFee)} fee). You pay {formatMoney(example.dueAtBooking)}{' '}
        when you book and {formatMoney(example.balance)} later.
      </li>
    </ul>
  )
}

export function PhotographerPayFacts() {
  const sourced = feeBreakdown(EXAMPLE_PRICE, 'gradsnap')
  const own = feeBreakdown(EXAMPLE_PRICE, 'own')
  return (
    <ul className="list-disc space-y-2 pl-5 text-sm leading-relaxed">
      <li>
        Commission is a share of your session price: {percent(COMMISSION_RATE.gradsnap)} on clients
        GradSnap brings you, {percent(COMMISSION_RATE.own)} on your own clients. The client&apos;s
        service fee is paid by the client on top and never comes out of your price.
      </li>
      <li>
        Example, {formatMoney(EXAMPLE_PRICE)} session: from a GradSnap client you receive{' '}
        {formatMoney(sourced.photographerPayout)} ({formatMoney(sourced.commission)} commission);
        from your own client you receive {formatMoney(own.photographerPayout)}. The client pays{' '}
        {formatMoney(sourced.total)} either way.
      </li>
      <li>You are paid {PAYOUT_HOURS_AFTER} hours after the session.</li>
    </ul>
  )
}

export function PolicyExceptions() {
  return (
    <ul className="list-disc space-y-2 pl-5 text-sm leading-relaxed">
      <li>
        Severe weather alerts and emergencies are reviewed case by case; we may move the session or
        adjust the refund.
      </li>
      <li>
        If the automatic charge before the session fails and isn&apos;t fixed in time, the booking
        can be cancelled under the normal rules.
      </li>
      <li>
        This page explains how GradSnap applies refunds; it is not a legal guarantee and the terms
        you accept at booking prevail.
      </li>
    </ul>
  )
}
