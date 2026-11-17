import Link from 'next/link'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { CANCELLATION_POLICY_PATH, FEES_PATH } from '@/lib/site'
import { feeBreakdown } from '@/lib/fees'
import { refundAmounts, refundFor } from '@/lib/cancellation-policy'
import { formatMoney } from '@/lib/price'
import { PublicShell } from '@/components/brand/public-shell'
import { PageHeader } from '@/components/dashboard/page-header'
import {
  ClientRefundTable,
  EXAMPLE_PRICE,
  PhotographerPenaltyTable,
  PolicyExceptions,
} from '@/components/fees/fee-tables'

export const metadata: Metadata = {
  title: 'Cancellation policy | GradSnap',
  description: 'How refunds work when a client or a photographer cancels a GradSnap session.',
  alternates: { canonical: CANCELLATION_POLICY_PATH },
}

const H2 = 'text-xl font-semibold tracking-tight'
const DAY_MS = 86_400_000
const EXAMPLE_DAYS_BEFORE = 10

// Worked examples computed with the same functions the app uses.
function Examples() {
  const breakdown = feeBreakdown(EXAMPLE_PRICE)
  const session = new Date(EXAMPLE_DAYS_BEFORE * DAY_MS)
  const cancelledAt = new Date(0)
  const tenDays = refundAmounts(breakdown, refundFor(session, cancelledAt, 'client'))
  const photographer = refundAmounts(breakdown, refundFor(session, cancelledAt, 'photographer'))
  return (
    <ul className="list-disc space-y-2 pl-5 text-sm leading-relaxed">
      <li>
        A {formatMoney(EXAMPLE_PRICE)} session costs {formatMoney(breakdown.total)} with the fee.
      </li>
      <li>
        The client cancels {EXAMPLE_DAYS_BEFORE} days before: they get {formatMoney(tenDays.clientRefund)} back; the
        photographer keeps {formatMoney(tenDays.photographerKeeps)} and GradSnap keeps the{' '}
        {formatMoney(tenDays.gradsnapKeeps)} fee.
      </li>
      <li>
        The photographer cancels at any time: the client gets {formatMoney(photographer.clientRefund)}{' '}
        back, fee included.
      </li>
    </ul>
  )
}

// Only exists while PAYMENTS_ENABLED=true; otherwise the site is unchanged.
export default function CancellationPolicyPage() {
  if (process.env.PAYMENTS_ENABLED !== 'true') notFound()

  return (
    <PublicShell>
      <PageHeader
        title="Cancellation policy"
        description="The earlier you cancel, the more you get back. Times are New York time."
      />
      <div className="max-w-3xl space-y-8">
        <section className="space-y-3">
          <h2 className={H2}>If you are the client</h2>
          <ClientRefundTable />
        </section>
        <section className="space-y-3">
          <h2 className={H2}>If you are the photographer</h2>
          <PhotographerPenaltyTable />
        </section>
        <section className="space-y-3 rounded-3xl bg-card p-6 sm:p-8">
          <h2 className={H2}>Examples</h2>
          <Examples />
        </section>
        <section className="space-y-3 rounded-3xl bg-card p-6 sm:p-8">
          <h2 className={H2}>Exceptions</h2>
          <PolicyExceptions />
        </section>
        <p className="text-sm text-muted-foreground">
          See also{' '}
          <Link href={FEES_PATH} className="font-medium text-foreground underline underline-offset-4">
            fees
          </Link>
          .
        </p>
      </div>
    </PublicShell>
  )
}
