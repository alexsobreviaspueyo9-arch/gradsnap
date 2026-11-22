import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import {
  BadgePercent,
  Briefcase,
  CalendarX2,
  Globe,
  Images,
  Wallet,
  type LucideIcon,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import {
  PHOTOGRAPHER_TERMS_VERSION,
  isTermsUpdate,
  needsTermsAcceptance,
} from '@/lib/photographer-terms'
import { CenteredShell } from '@/components/brand/centered-shell'
import { PhotographerTermsText } from '@/components/photographer/terms-text'
import { AcceptTermsForm } from '@/components/photographer/accept-terms-form'

export const metadata: Metadata = {
  title: 'Photographer terms | GradSnap',
  robots: { index: false, follow: false },
}

// Plain-language summary of the full text below; "(draft)" items point at
// sections that are still placeholders for the lawyer.
const SUMMARY: { icon: LucideIcon; title: string; body: string }[] = [
  {
    icon: BadgePercent,
    title: 'Commission',
    body: '0% today. If GradSnap ever adds a commission, you hear about it before it applies and can leave.',
  },
  {
    icon: Wallet,
    title: 'Getting paid',
    body: 'Clients pay you directly, by your Stripe link or in cash. GradSnap never holds your money, so there is no payout to wait for.',
  },
  {
    icon: CalendarX2,
    title: 'Cancellations',
    body: 'Cancel at least 48 hours before a session to avoid penalties. Repeated last-minute cancellations can suspend your account.',
  },
  {
    icon: Globe,
    title: 'Public profile (draft)',
    body: 'Your profile, portfolio and open times are visible to anyone, including search engines.',
  },
  {
    icon: Images,
    title: 'Your photos',
    body: 'You confirm you own them. GradSnap shows them on your profile and may use thumbnails to promote GradSnap.',
  },
  {
    icon: Briefcase,
    title: 'Independent contractor (draft)',
    body: 'You run your own business; you are not employed by GradSnap.',
  },
]

export default async function PhotographerTermsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('photographer_profiles')
    .select('has_signed_contract, terms_version')
    .eq('user_id', user.id)
    .maybeSingle()
  if (!profile) redirect('/dashboard/photographer')
  if (!needsTermsAcceptance(profile)) redirect('/dashboard/photographer')

  return (
    <CenteredShell className="max-w-2xl">
      <section className="space-y-8 rounded-2xl border border-border bg-card p-6 sm:p-8">
        <header>
          <h1 className="text-3xl font-medium">Photographer terms</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {isTermsUpdate(profile)
              ? 'We updated the terms. Review and accept them to keep using your dashboard.'
              : 'Read and accept the terms before using your dashboard.'}{' '}
            Version {PHOTOGRAPHER_TERMS_VERSION}.
          </p>
        </header>

        <div>
          <h2 className="mb-3 text-lg font-medium">In short</h2>
          <ul className="grid gap-x-8 border-t border-border sm:grid-cols-2">
            {SUMMARY.map(({ icon: Icon, title, body }) => (
              <li key={title} className="flex gap-3 border-b border-border py-4">
                <Icon className="mt-0.5 size-5 shrink-0" strokeWidth={1.75} aria-hidden />
                <div>
                  <p className="font-medium">{title}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{body}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h2 className="mb-3 text-lg font-medium">Full terms</h2>
          <div
            tabIndex={0}
            aria-label="Full photographer terms"
            className="max-h-96 space-y-4 overflow-y-auto rounded-xl border border-input p-5 text-sm text-muted-foreground"
          >
            <PhotographerTermsText />
          </div>
        </div>

        <AcceptTermsForm />
      </section>
    </CenteredShell>
  )
}
