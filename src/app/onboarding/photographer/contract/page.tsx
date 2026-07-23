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
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-12">
      <div className="w-full max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Photographer Agreement</CardTitle>
            <CardDescription>
              Read and accept the terms before accessing your dashboard.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="rounded-lg border bg-muted/40 p-5 space-y-4 text-sm text-muted-foreground max-h-80 overflow-y-auto">
              <h3 className="font-semibold text-foreground">
                1. Commission Structure
              </h3>
              <p>
                GradSnap charges a <strong>15% platform commission</strong> on every
                booking made through the platform. This fee covers payment
                processing, customer support and platform maintenance.
              </p>
              <Separator />
              <h3 className="font-semibold text-foreground">2. Payments</h3>
              <p>
                Payouts are processed within 5 business days after the session is
                marked as completed by the client. GradSnap reserves the right to
                withhold payment in cases of disputed bookings.
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
                including the <strong>15% commission</strong> on all bookings.
              </Label>
            </div>

            <Button
              className="w-full"
              onClick={handleAccept}
              disabled={!accepted || loading}
            >
              {loading ? 'Saving…' : 'Accept and go to my dashboard'}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
