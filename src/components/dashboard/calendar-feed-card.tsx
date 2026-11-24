'use client'

import { useState } from 'react'
import { CalendarSync } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { usePreviewMode } from '@/components/preview/preview-mode'

// Private iCal link: subscribe from Google Calendar ("From URL"). Anyone with
// the link sees the bookings, so it can be replaced (old link stops working).
export function CalendarFeedCard({ initialToken, siteUrl }: { initialToken: string | null; siteUrl: string }) {
  const isPreview = usePreviewMode()
  const [token, setToken] = useState(initialToken)
  const [isBusy, setIsBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const url = token ? `${siteUrl}/api/calendar/${token}` : null

  async function reset() {
    if (token && !window.confirm('Replace your calendar link? The old one stops working right away.')) return
    setMessage(null)
    if (isPreview) {
      setMessage('Preview: no link is created.')
      return
    }
    setIsBusy(true)
    const { data, error } = await createClient().rpc('reset_calendar_feed')
    setIsBusy(false)
    if (error || !data) {
      setMessage("Couldn't create the link. Try again.")
      return
    }
    setToken(data)
    setMessage(token ? 'New link created. Update it in your calendar app.' : 'Link created.')
  }

  async function copy() {
    if (!url) return
    try {
      await navigator.clipboard.writeText(url)
      setMessage('Link copied.')
    } catch {
      setMessage("Couldn't copy. Select the link and copy it by hand.")
    }
  }

  return (
    <section aria-labelledby="calendar-feed" className="space-y-4 rounded-2xl border border-border bg-card p-6 sm:p-7 gs-elev-1">
      <div className="flex items-start gap-3">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-muted">
          <CalendarSync className="size-5" strokeWidth={1.75} aria-hidden />
        </span>
        <div>
          <h2 id="calendar-feed" className="text-xl font-medium">
            Calendar feed
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            See your GradSnap bookings in Google Calendar: Other calendars → From URL → paste this link.
            Keep it private.
          </p>
        </div>
      </div>
      {url && <code className="block rounded-2xl bg-muted px-4 py-3 text-sm break-all">{url}</code>}
      <div className="flex flex-wrap gap-2">
        {url && (
          <Button type="button" variant="secondary" className="h-11 px-5" onClick={copy}>
            Copy link
          </Button>
        )}
        <Button type="button" variant="outline" className="h-11 px-5" disabled={isBusy} onClick={reset}>
          {isBusy ? 'Working…' : token ? 'Replace link' : 'Create calendar link'}
        </Button>
      </div>
      {message && (
        <p aria-live="polite" className="text-sm text-muted-foreground">
          {message}
        </p>
      )}
    </section>
  )
}
