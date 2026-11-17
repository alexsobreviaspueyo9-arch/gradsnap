'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { trackEvent } from '@/lib/posthog'
import { PHOTOGRAPHER_TERMS_VERSION } from '@/lib/photographer-terms'

// One checkbox, one primary button. The database accepts only the current
// version, so a stale tab can't accept outdated terms.
export function AcceptTermsForm() {
  const router = useRouter()
  const [accepted, setAccepted] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleAccept() {
    if (!accepted) return
    setError(null)
    setIsSaving(true)

    const { error: acceptError } = await createClient().rpc('accept_photographer_terms', {
      p_version: PHOTOGRAPHER_TERMS_VERSION,
    })
    if (acceptError) {
      setError(acceptError.message)
      setIsSaving(false)
      return
    }

    trackEvent('photographer_terms_accepted', { version: PHOTOGRAPHER_TERMS_VERSION })
    router.push('/dashboard/photographer')
    router.refresh()
  }

  return (
    <div className="space-y-5">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      <div className="flex items-start gap-3">
        <Checkbox
          id="accept-terms"
          checked={accepted}
          onCheckedChange={(value) => setAccepted(value === true)}
        />
        <Label htmlFor="accept-terms" className="cursor-pointer leading-relaxed">
          I have read and agree to the GradSnap Photographer terms (version {PHOTOGRAPHER_TERMS_VERSION}).
        </Label>
      </div>
      <Button className="h-12 w-full text-base" onClick={handleAccept} disabled={!accepted || isSaving}>
        {isSaving ? 'Saving…' : 'Accept and continue'}
      </Button>
    </div>
  )
}
