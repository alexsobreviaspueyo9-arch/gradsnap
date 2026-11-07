'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { trackEvent } from '@/lib/posthog'
import type { SignupSrc } from '@/types/database'

export function ClaimProfileButton({ token, src }: { token: string; src: SignupSrc | null }) {
  const router = useRouter()
  const [isClaiming, setIsClaiming] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleClaim() {
    setError(null)
    setIsClaiming(true)
    const supabase = createClient()
    // The database checks the token, its expiry and the account role, and
    // uses the token up in the same transaction.
    const { error: claimError } = await supabase.rpc('claim_photographer_invite', { p_token: token })
    if (claimError) {
      setError(claimError.message)
      setIsClaiming(false)
      return
    }
    trackEvent('photographer_profile_claimed', { src })
    // The dashboard sends unsigned photographers to the agreement first.
    router.push('/dashboard/photographer/profile')
  }

  return (
    <div className="space-y-3">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      <Button type="button" className="h-11 px-5" disabled={isClaiming} onClick={handleClaim}>
        {isClaiming ? 'Claiming…' : 'Claim my profile'}
      </Button>
    </div>
  )
}
