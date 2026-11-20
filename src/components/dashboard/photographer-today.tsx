import Link from 'next/link'
import { CheckCircle2, Circle } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ChecklistItem } from '@/lib/photographer-dashboard'

export type TodayData = {
  requests: { id: string; clientName: string; when: string; timeLeft: string }[]
  unreadCount: number
  sessionsToday: { id: string; clientName: string; time: string }[]
  pendingDeliveries: number
  responseHours: number | null
}

const PANEL = 'rounded-3xl bg-card p-6 sm:p-7'
const LINK = 'font-medium text-foreground underline underline-offset-4'

// What needs the photographer now: requests about to expire, unread chats,
// today's sessions and photos still to deliver.
export function TodayPanel({ data, basePath }: { data: TodayData; basePath: string }) {
  const nothing =
    data.requests.length === 0 &&
    data.unreadCount === 0 &&
    data.sessionsToday.length === 0 &&
    data.pendingDeliveries === 0

  return (
    <section aria-labelledby="today-heading" className={PANEL}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="today-heading" className="text-xl font-semibold tracking-tight">
          Today
        </h2>
        <p className="text-sm text-muted-foreground">
          {data.responseHours == null
            ? 'Reply time shows after 3 answered requests'
            : `Your median reply time: ${data.responseHours} h (90 days)`}
        </p>
      </div>

      {nothing ? (
        <p className="mt-3 text-sm text-muted-foreground">Nothing waiting for you right now.</p>
      ) : (
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div className="space-y-2 rounded-2xl bg-muted p-4">
            <h3 className="font-semibold">Requests to confirm ({data.requests.length})</h3>
            {data.requests.length === 0 ? (
              <p className="text-sm text-muted-foreground">None.</p>
            ) : (
              <ul className="space-y-1.5 text-sm">
                {data.requests.map((r) => (
                  <li key={r.id} className="flex flex-wrap justify-between gap-x-3">
                    <span>
                      {r.clientName} · {r.when}
                    </span>
                    <span className="font-medium text-warning">{r.timeLeft}</span>
                  </li>
                ))}
              </ul>
            )}
            {data.requests.length > 0 && (
              <p className="text-sm">
                <Link href={`${basePath}/bookings`} className={LINK}>
                  Confirm or decline
                </Link>{' '}
                <span className="text-muted-foreground">Requests expire after 48 hours.</span>
              </p>
            )}
          </div>
          <div className="space-y-2 rounded-2xl bg-muted p-4">
            <h3 className="font-semibold">Sessions today ({data.sessionsToday.length})</h3>
            {data.sessionsToday.length === 0 ? (
              <p className="text-sm text-muted-foreground">None.</p>
            ) : (
              <ul className="space-y-1.5 text-sm">
                {data.sessionsToday.map((s) => (
                  <li key={s.id}>
                    {s.time} · {s.clientName}
                  </li>
                ))}
              </ul>
            )}
          </div>
          <p className="rounded-2xl bg-muted p-4 text-sm">
            <span className="font-semibold">Unread messages: {data.unreadCount}</span>
            {data.unreadCount > 0 && (
              <>
                {' · '}
                <Link href={`${basePath}/messages`} className={LINK}>
                  Open messages
                </Link>
              </>
            )}
          </p>
          <p className="rounded-2xl bg-muted p-4 text-sm">
            <span className="font-semibold">Photos to deliver: {data.pendingDeliveries}</span>
            {data.pendingDeliveries > 0 && (
              <>
                {' · '}
                <Link href={`${basePath}/bookings`} className={LINK}>
                  Mark delivered
                </Link>
              </>
            )}
          </p>
        </div>
      )}
    </section>
  )
}

export function OnboardingChecklist({
  percent,
  items,
  nextStep,
  basePath,
}: {
  percent: number
  items: ChecklistItem[]
  nextStep: string | null
  basePath: string
}) {
  if (percent === 100) return null
  return (
    <section aria-labelledby="checklist-heading" className={PANEL}>
      <h2 id="checklist-heading" className="text-xl font-semibold tracking-tight">
        Profile {percent}%{nextStep ? `: ${nextStep.charAt(0).toLowerCase()}${nextStep.slice(1)}` : ''}
      </h2>
      <div
        role="progressbar"
        aria-label="Profile completeness"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
        className="mt-3 h-2 overflow-hidden rounded-full bg-muted"
      >
        <span className="block h-full rounded-full bg-success" style={{ width: `${percent}%` }} />
      </div>
      <ul className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
        {items.map((item) => (
          <li key={item.key} className={cn('flex items-center gap-2', item.done && 'text-muted-foreground')}>
            {item.done ? (
              <CheckCircle2 className="size-4 shrink-0 text-success" aria-hidden />
            ) : (
              <Circle className="size-4 shrink-0" aria-hidden />
            )}
            <span>
              {item.label}
              <span className="sr-only">{item.done ? ' (done)' : ' (to do)'}</span>
            </span>
          </li>
        ))}
      </ul>
      <p className="mt-4 text-sm">
        <Link href={`${basePath}/profile`} className={LINK}>
          Finish your profile
        </Link>
      </p>
    </section>
  )
}
