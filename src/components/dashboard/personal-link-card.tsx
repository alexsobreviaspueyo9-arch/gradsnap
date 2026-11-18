'use client'

import { useState } from 'react'
import { Link2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { usePreviewMode } from '@/components/preview/preview-mode'
import type { BookingSourceCounts } from '@/lib/ref-code'

// The photographer's own link: bookings through it count as theirs (no
// GradSnap commission planned on them). Copy is the card's only action.
export function PersonalLinkCard({ link, counts }: { link: string; counts: BookingSourceCounts }) {
  const isPreview = usePreviewMode()
  const [isCopied, setIsCopied] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function copy() {
    setError(null)
    try {
      await navigator.clipboard.writeText(link)
      setIsCopied(true)
      setTimeout(() => setIsCopied(false), 2000)
    } catch {
      setError("Couldn't copy. Select the link and copy it by hand.")
    }
  }

  return (
    <section aria-labelledby="personal-link" className="space-y-4 rounded-3xl bg-card p-6 sm:p-7">
      <div className="flex items-start gap-3">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-muted">
          <Link2 className="size-5" strokeWidth={1.75} aria-hidden />
        </span>
        <div className="min-w-0">
          <h2 id="personal-link" className="text-xl font-semibold tracking-tight">
            Your booking link
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Share it on Instagram or with your own clients. Bookings made through it count as yours.
          </p>
        </div>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <code className="min-w-0 flex-1 rounded-2xl bg-muted px-4 py-3 text-sm break-all">{link}</code>
        <Button
          type="button"
          variant="secondary"
          className="h-11 px-5"
          onClick={copy}
          disabled={isPreview}
        >
          {isCopied ? 'Copied' : 'Copy link'}
        </Button>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <dl className="grid grid-cols-2 gap-3 text-sm">
        <div className="rounded-2xl bg-muted p-4">
          <dt className="text-muted-foreground">Bookings from your link</dt>
          <dd className="mt-1 text-2xl font-semibold tabular-nums">{counts.photographerLink}</dd>
        </div>
        <div className="rounded-2xl bg-muted p-4">
          <dt className="text-muted-foreground">Bookings from GradSnap</dt>
          <dd className="mt-1 text-2xl font-semibold tabular-nums">{counts.marketplace}</dd>
        </div>
      </dl>
    </section>
  )
}
