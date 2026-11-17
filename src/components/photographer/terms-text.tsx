import { Separator } from '@/components/ui/separator'

const SECTION = 'font-semibold text-foreground'

// Shown where a section still has to be written by GradSnap's lawyer.
function Placeholder({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-2xl border border-dashed border-input bg-card p-4 text-foreground">
      <strong>Placeholder, not yet part of these terms.</strong> {children}
    </p>
  )
}

// Full photographer terms. Sections 1–5 are the 2026-10 agreement, unchanged
// (archived in docs/legal/photographer-agreement-2026-10.md). Sections 6–9 are
// marked placeholders for the lawyer. Do not edit legal wording casually.
export function PhotographerTermsText() {
  return (
    <>
      <h3 className={SECTION}>1. Commission Structure</h3>
      <p>
        GradSnap currently charges <strong>0% commission</strong> on bookings made through the
        platform. Whatever you set as your price is what you get paid.
      </p>
      <p>
        GradSnap may introduce a commission or other fees in the future. If it does, we will tell
        you in advance, before any change applies to your bookings, and you will be free to stop
        using the platform.
      </p>
      <p>
        GradSnap is not a replacement for your existing marketing — it&apos;s an additional channel
        to reach graduating students who are actively looking for a photographer.
      </p>
      <Separator />
      <h3 className={SECTION}>2. Payments</h3>
      <p>
        GradSnap does not process payments and never holds your money — there are no payouts for
        us to send you, because the money never passes through us in the first place. Clients pay
        you directly.
      </p>
      <p>
        You choose how you want to get paid, and that choice is shown on your public profile so
        clients know what to expect before booking:
      </p>
      <ul className="list-disc space-y-1 pl-5">
        <li>
          <strong>Stripe</strong> — through a Stripe Payment Link you set up yourself and add to
          your profile settings.
        </li>
        <li>
          <strong>Cash</strong> — paid to you in person.
        </li>
      </ul>
      <p>You also decide whether you ask for a deposit to confirm the booking, and how much.</p>
      <p>
        Since payment happens outside GradSnap, we have no way to verify it automatically — you
        mark a booking as paid yourself from your bookings dashboard once you&apos;ve actually
        received the money.
      </p>
      <Separator />
      <h3 className={SECTION}>3. Cancellations</h3>
      <p>
        Photographers must cancel at least 48 hours before a session to avoid penalties. Repeated
        last-minute cancellations may result in account suspension.
      </p>
      <Separator />
      <h3 className={SECTION}>4. Content</h3>
      <p>
        By listing your work on GradSnap you confirm you own or have the right to use all portfolio
        images uploaded. GradSnap may use portfolio thumbnails for promotional purposes.
      </p>
      <Separator />
      <h3 className={SECTION}>5. Account Suspension</h3>
      <p>
        GradSnap reserves the right to suspend or terminate accounts that violate these terms,
        engage in fraudulent activity or receive repeated negative reviews.
      </p>
      <Separator />
      <h3 className={SECTION}>6. Public profile</h3>
      <Placeholder>
        TODO (lawyer): your profile, portfolio and open times are visible to anyone, including
        people without an account and search engines.
      </Placeholder>
      <Separator />
      <h3 className={SECTION}>7. Photo licence</h3>
      <Placeholder>
        TODO (lawyer): scope of the licence you give GradSnap to display your photos on the site
        and use them to promote GradSnap, and how it ends when you delete them.
      </Placeholder>
      <Separator />
      <h3 className={SECTION}>8. Independent contractor</h3>
      <Placeholder>
        TODO (lawyer): you work for yourself, not as an employee or agent of GradSnap.
      </Placeholder>
      <Separator />
      <h3 className={SECTION}>9. Clients introduced by GradSnap</h3>
      <Placeholder>
        TODO (lawyer): a mild non-circumvention clause that applies only to clients GradSnap
        brought you, never to your own clients.
      </Placeholder>
    </>
  )
}
