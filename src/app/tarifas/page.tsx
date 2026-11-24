import Link from 'next/link'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { CANCELLATION_POLICY_PATH, FEES_PATH } from '@/lib/site'
import { PublicShell } from '@/components/brand/public-shell'
import { PageHeader } from '@/components/dashboard/page-header'
import { ClientFeeFacts, PhotographerPayFacts } from '@/components/fees/fee-tables'

export const metadata: Metadata = {
  title: 'Fees | GradSnap',
  description: 'What clients pay, what photographers receive, and when.',
  alternates: { canonical: FEES_PATH },
}

const SECTION = 'space-y-3 rounded-2xl border border-border bg-card p-6 sm:p-8 gs-elev-1'

// Only exists while PAYMENTS_ENABLED=true; otherwise the site is unchanged.
export default function FeesPage() {
  if (process.env.PAYMENTS_ENABLED !== 'true') notFound()

  return (
    <PublicShell>
      <PageHeader title="Fees" description="What clients pay, what photographers receive, and when." />
      <div className="max-w-3xl space-y-4">
        <section className={SECTION}>
          <h2 className="text-xl font-medium">For clients</h2>
          <ClientFeeFacts />
        </section>
        <section className={SECTION}>
          <h2 className="text-xl font-medium">For photographers</h2>
          <PhotographerPayFacts />
        </section>
        <p className="text-sm text-muted-foreground">
          Refunds and penalties are on the{' '}
          <Link
            href={CANCELLATION_POLICY_PATH}
            className="font-medium text-foreground underline underline-offset-4"
          >
            cancellation policy
          </Link>
          .
        </p>
      </div>
    </PublicShell>
  )
}
