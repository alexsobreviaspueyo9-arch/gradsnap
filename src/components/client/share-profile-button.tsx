'use client'

import { useState } from 'react'
import { Share2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PUBLIC_PHOTOGRAPHERS_PATH } from '@/lib/guest-booking'

// Shares the public profile (no account needed to open it): the system share
// sheet where available, otherwise copies the link.
export function ShareProfileButton({ photographerId, name }: { photographerId: string; name: string }) {
  const [status, setStatus] = useState<'idle' | 'copied' | 'failed'>('idle')

  async function share() {
    const url = `${window.location.origin}${PUBLIC_PHOTOGRAPHERS_PATH}/${photographerId}`
    try {
      if (navigator.share) {
        await navigator.share({ title: `${name} on GradSnap`, url })
        return
      }
      await navigator.clipboard.writeText(url)
      setStatus('copied')
      setTimeout(() => setStatus('idle'), 2000)
    } catch (err) {
      // Closing the share sheet isn't an error worth showing.
      if (err instanceof DOMException && err.name === 'AbortError') return
      setStatus('failed')
    }
  }

  return (
    <div className="space-y-1">
      <Button type="button" variant="outline" size="sm" className="h-9 gap-1.5 px-4" onClick={share}>
        <Share2 className="size-4" aria-hidden />
        {status === 'copied' ? 'Link copied' : 'Share'}
      </Button>
      {status === 'failed' && (
        <p className="text-xs text-destructive">Couldn&apos;t share. Copy the address bar instead.</p>
      )}
    </div>
  )
}
