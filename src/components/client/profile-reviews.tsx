import { Star } from 'lucide-react'
import { formatMessageTime } from '@/lib/chat'

export type ProfileReview = {
  id: string
  rating: number
  body: string | null
  created_at: string
  client_first_name: string | null
}

function Stars({ rating }: { rating: number }) {
  return (
    <span role="img" aria-label={`${rating} out of 5 stars`} className="inline-flex gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          aria-hidden
          strokeWidth={1.5}
          className={n <= rating ? 'size-4 fill-current text-foreground' : 'size-4 text-muted-foreground'}
        />
      ))}
    </span>
  )
}

// Real reviews only: written by clients after a completed booking. With none
// yet, say so plainly (no placeholders).
export function ProfileReviews({
  reviews,
  ratingAvg,
  reviewCount,
}: {
  reviews: ProfileReview[]
  ratingAvg: number | null
  reviewCount: number
}) {
  return (
    <section aria-labelledby="reviews-heading" className="rounded-2xl border border-border bg-card p-6 sm:p-8 gs-elev-1">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="reviews-heading" className="text-xl font-medium">
          Reviews
        </h2>
        {reviewCount > 0 && ratingAvg != null && (
          <p className="inline-flex items-center gap-1.5 text-sm font-medium tabular-nums">
            <Star aria-hidden strokeWidth={1.5} className="size-4 fill-current" />
            {ratingAvg.toFixed(1)}, {reviewCount} review{reviewCount === 1 ? '' : 's'}
          </p>
        )}
      </div>
      {reviews.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">No reviews yet.</p>
      ) : (
        <ul className="mt-4 space-y-4">
          {reviews.map((review) => (
            <li key={review.id} className="border-t border-border pt-4 first:border-0 first:pt-0">
              <p className="flex flex-wrap items-baseline gap-x-3 text-sm">
                <Stars rating={review.rating} />
                <span className="font-medium">{review.client_first_name ?? 'A client'}</span>
                <span className="text-muted-foreground">{formatMessageTime(review.created_at)}</span>
              </p>
              {review.body && (
                <p className="mt-2 text-sm leading-relaxed whitespace-pre-line">{review.body}</p>
              )}
            </li>
          ))}
        </ul>
      )}
      <p className="mt-4 text-xs text-muted-foreground">
        Reviews come from clients after a completed session. Photographers can&apos;t edit or remove them.
      </p>
    </section>
  )
}
