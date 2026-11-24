import type { Metadata } from 'next'
import { Mail } from 'lucide-react'
import { CONTACT_EMAIL, CONTACT_PATH } from '@/lib/site'
import { PublicShell } from '@/components/brand/public-shell'
import { PageHeader } from '@/components/dashboard/page-header'

export const metadata: Metadata = {
  title: 'Contact | GradSnap',
  description: 'Questions about a booking or about GradSnap? Write to us.',
  alternates: { canonical: CONTACT_PATH },
}

const SECTION = 'space-y-3 rounded-2xl border border-border bg-card p-6 sm:p-8 gs-elev-1'

export default function ContactPage() {
  return (
    <PublicShell>
      <PageHeader title="Contact" description="Questions about a booking or about GradSnap? Write to us." />
      <div className="max-w-2xl space-y-4">
        <section className={SECTION}>
          <h2 className="text-xl font-medium">Email</h2>
          <a
            href={`mailto:${CONTACT_EMAIL}`}
            className="inline-flex min-h-11 items-center gap-2 text-base font-medium underline underline-offset-4"
          >
            <Mail className="size-5" strokeWidth={1.75} aria-hidden />
            {CONTACT_EMAIL}
          </a>
          <p className="text-sm text-muted-foreground">
            We usually answer within one business day (New York time).
          </p>
        </section>

        <section className={SECTION}>
          <h2 className="text-xl font-medium">Who is behind GradSnap</h2>
          {/* TODO(owner): replace this placeholder with the real description. */}
          <p className="rounded-xl border border-border bg-muted p-4 text-sm">
            <strong>TODO:</strong> who runs GradSnap (names, where you are based, why you built it).
            This placeholder will be replaced before launch.
          </p>
        </section>
      </div>
    </PublicShell>
  )
}
