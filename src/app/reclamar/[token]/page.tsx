import Link from 'next/link'
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { parseSignupSrc } from '@/lib/signup-src'
import { CenteredShell } from '@/components/brand/centered-shell'
import { ClaimProfileButton } from '@/components/photographer/claim-profile-button'

export const metadata: Metadata = {
  title: 'Claim your GradSnap profile',
  robots: { index: false, follow: false },
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-3xl bg-card p-6 sm:p-8">
      <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
      <div className="mt-3 space-y-5 text-sm leading-relaxed text-muted-foreground">{children}</div>
    </section>
  )
}

export default async function ClaimInvitePage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>
  searchParams: Promise<{ src?: string }>
}) {
  const { token } = await params
  const src = parseSignupSrc((await searchParams).src)
  const supabase = await createClient()

  const { data: invites } = await supabase.rpc('get_photographer_invite', { p_token: token })
  const invite = invites?.[0] ?? null

  if (!invite) {
    return (
      <CenteredShell>
        <Panel title="This link isn't valid">
          <p>It may have been used already. If you claimed your profile, sign in to see it.</p>
          <Link href="/login" className={cn(buttonVariants({ variant: 'secondary' }), 'h-11 px-5')}>
            Sign in
          </Link>
        </Panel>
      </CenteredShell>
    )
  }

  if (invite.state === 'expired') {
    return (
      <CenteredShell>
        <Panel title="This link has expired">
          <p>Invite links last 14 days. Reply to our message and we&apos;ll send you a new one.</p>
        </Panel>
      </CenteredShell>
    )
  }

  const here = `/reclamar/${token}${src ? `?src=${src}` : ''}`
  const next = encodeURIComponent(here)
  const name = invite.display_name ?? 'your business'

  const {
    data: { user },
  } = await supabase.auth.getUser()
  const { data: profile } = user
    ? await supabase.from('profiles').select('role').eq('id', user.id).single()
    : { data: null }

  if (!user) {
    return (
      <CenteredShell>
        <Panel title={`A GradSnap profile is ready for ${name}`}>
          <p>
            We started a photographer profile for you with your name, area and links. Create your
            account (or sign in) to claim it, then add your own photos, prices and availability.
            Nothing goes live until you claim it.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              href={`/register?role=photographer${src ? `&src=${src}` : ''}&next=${next}`}
              className={cn(buttonVariants(), 'h-11 px-5')}
            >
              Create my account
            </Link>
            <Link
              href={`/login?next=${next}`}
              className={cn(buttonVariants({ variant: 'secondary' }), 'h-11 px-5')}
            >
              I have an account
            </Link>
          </div>
        </Panel>
      </CenteredShell>
    )
  }

  if (profile?.role !== 'photographer') {
    return (
      <CenteredShell>
        <Panel title="This invite is for a photographer account">
          <p>
            You&apos;re signed in with a client account. Sign out, then create a photographer account
            with a different email to claim this profile.
          </p>
        </Panel>
      </CenteredShell>
    )
  }

  return (
    <CenteredShell>
      <Panel title={`Claim the profile for ${name}`}>
        <p>
          It will be added to your account. Next you&apos;ll review the photographer agreement, then
          edit your profile and upload your own photos.
        </p>
        <ClaimProfileButton token={token} src={src} />
      </Panel>
    </CenteredShell>
  )
}
