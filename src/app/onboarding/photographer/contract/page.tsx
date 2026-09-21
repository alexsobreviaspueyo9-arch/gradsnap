'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { CenteredShell } from '@/components/brand/centered-shell'

export default function ContractPage() {
  const router = useRouter()
  const supabase = createClient()

  const [accepted, setAccepted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleAccept() {
    if (!accepted) return
    setError(null)
    setLoading(true)

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      router.push('/login')
      return
    }

    const { error: updateError } = await supabase
      .from('photographer_profiles')
      .update({ has_signed_contract: true })
      .eq('user_id', user.id)

    if (updateError) {
      setError(updateError.message)
      setLoading(false)
      return
    }

    router.push('/dashboard/photographer')
  }

  return (
    <CenteredShell className="max-w-2xl">
      <div>
        <Card className="rounded-3xl py-6">
          <CardHeader>
            <CardTitle className="text-2xl">Photographer Agreement</CardTitle>
            <CardDescription>
              Read and accept the terms before accessing your dashboard.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="rounded-2xl bg-accent p-5 text-center">
              <p className="font-heading text-4xl font-bold tracking-tight text-primary">
                0% commission
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Every euro your clients pay goes to you. GradSnap is a free,
                additional channel on top of your existing marketing — not a
                replacement for it — to bring you more clients at no cost.
              </p>
            </div>

            <div className="max-h-80 space-y-4 overflow-y-auto rounded-2xl border bg-muted/40 p-5 text-sm text-muted-foreground">
              <h3 className="font-semibold text-foreground">
                1. Commission Structure
              </h3>
              <p>
                GradSnap charges <strong>0% commission</strong> on every booking
                made through the platform. Whatever you set as your price is
                what you get paid — GradSnap takes no cut, now or in the
                future for bookings made under this agreement.
              </p>
              <p>
                GradSnap is not a replacement for your existing marketing — it&apos;s
                an additional, free channel to reach graduating students who are
                actively looking for a photographer, at no cost to you.
              </p>
              <Separator />
              <h3 className="font-semibold text-foreground">2. Payments</h3>
              <p>
                GradSnap does not process payments and never holds your
                money — there are no payouts for us to send you, because the
                money never passes through us in the first place. Clients pay
                you directly, using a payment link you set up yourself (for
                example, a free Stripe Payment Link, or PayPal.me) and add to
                your profile settings.
              </p>
              <p>
                You choose how you want to get paid, and that choice is shown
                on your public profile so clients know what to expect before
                booking:
              </p>
              <ul className="list-disc space-y-1 pl-5">
                <li>
                  <strong>50% deposit via Stripe</strong> — the client pays
                  half through your Stripe Payment Link to confirm the
                  booking, and pays you the rest in cash on the day of the
                  session.
                </li>
                <li>
                  <strong>Cash on session day</strong> — no deposit, no link
                  needed up front; the client pays the full amount in cash
                  once the session is done.
                </li>
              </ul>
              <p>
                Since payment happens outside GradSnap, we have no way to
                verify it automatically — you mark a booking as paid yourself
                from your bookings dashboard once you&apos;ve actually
                received the money.
              </p>
              <Separator />
              <h3 className="font-semibold text-foreground">3. Cancellations</h3>
              <p>
                Photographers must cancel at least 48 hours before a session to
                avoid penalties. Repeated last-minute cancellations may result in
                account suspension.
              </p>
              <Separator />
              <h3 className="font-semibold text-foreground">4. Content</h3>
              <p>
                By listing your work on GradSnap you confirm you own or have the
                right to use all portfolio images uploaded. GradSnap may use
                portfolio thumbnails for promotional purposes.
              </p>
              <Separator />
              <h3 className="font-semibold text-foreground">
                5. Account Suspension
              </h3>
              <p>
                GradSnap reserves the right to suspend or terminate accounts that
                violate these terms, engage in fraudulent activity or receive
                repeated negative reviews.
              </p>
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="flex items-start gap-3">
              <Checkbox
                id="accept"
                checked={accepted}
                onCheckedChange={(v) => setAccepted(v === true)}
              />
              <Label htmlFor="accept" className="leading-relaxed cursor-pointer">
                I have read and agree to the GradSnap Photographer Agreement,
                including the <strong>0% commission</strong> on all bookings.
              </Label>
            </div>

            <Button
              className="h-12 w-full text-base"
              onClick={handleAccept}
              disabled={!accepted || loading}
            >
              {loading ? 'Saving…' : 'Accept and go to my dashboard'}
            </Button>
          </CardContent>
        </Card>
      </div>
    </CenteredShell>
  )
}
