'use client'

import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { trackEvent } from '@/lib/posthog'
import { GRAD_PARAM } from '@/lib/grad-date'

// Plain GET form (works without JS): /photographers?grad=YYYY-MM-DD, or no
// param when the optional date is left empty.
export function FindPhotographersForm() {
  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    const input = e.currentTarget.elements.namedItem(GRAD_PARAM) as HTMLInputElement | null
    const hasGradDate = !!input?.value
    // An empty field would still add "?grad=": drop it from the submission.
    if (input && !hasGradDate) input.disabled = true
    trackEvent('find_photographers_clicked', { has_grad_date: hasGradDate })
  }

  return (
    <form action="/photographers" method="get" onSubmit={handleSubmit} className="mt-8 max-w-md space-y-2">
      <label htmlFor="hero-graduation-date" className="block text-sm font-medium">
        When is your graduation?
      </label>
      <div className="flex flex-col gap-3 sm:flex-row">
        <input
          id="hero-graduation-date"
          name={GRAD_PARAM}
          type="date"
          aria-describedby="hero-graduation-hint"
          className="h-12 w-full rounded-[10px] border border-input bg-card px-3 text-base outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        />
        <button type="submit" className={cn(buttonVariants({ size: 'lg' }), 'h-12 shrink-0 px-5 text-base')}>
          Find photographers
        </button>
      </div>
      <p id="hero-graduation-hint" className="flex items-center gap-2 text-sm text-muted-foreground">
        <span aria-hidden className="gs-seal size-2 shrink-0 rounded-full" />
        Optional. We&apos;ll highlight it on the calendar.
      </p>
    </form>
  )
}
