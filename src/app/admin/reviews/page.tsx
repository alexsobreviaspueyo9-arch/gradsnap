import type { Metadata } from 'next'
import { requireAdmin } from '@/lib/admin'
import { createServiceClient } from '@/lib/supabase/service'
import { formatMessageTime } from '@/lib/chat'
import { PageHeader } from '@/components/dashboard/page-header'
import { Button } from '@/components/ui/button'
import { removeReview } from '@/app/admin/reviews/actions'

export const metadata: Metadata = { title: 'Reviews · GradSnap admin' }

const RECENT_LIMIT = 100
const FIELD =
  'h-11 rounded-lg border border-input bg-card px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50'

export default async function AdminReviewsPage() {
  await requireAdmin()
  const supabase = createServiceClient()
  const { data: reviews, error } = await supabase
    .from('reviews')
    .select('id, rating, body, created_at, removed_at, removed_reason, photographer_id')
    .order('created_at', { ascending: false })
    .limit(RECENT_LIMIT)
  if (error) console.error('Loading reviews failed:', error.message)

  const photographerIds = [...new Set((reviews ?? []).map((r) => r.photographer_id))]
  const { data: photographers } =
    photographerIds.length > 0
      ? await supabase.from('photographer_profiles').select('id, display_name').in('id', photographerIds)
      : { data: [] }
  const nameById = new Map((photographers ?? []).map((p) => [p.id, p.display_name]))

  return (
    <>
      <PageHeader
        title="Reviews"
        description="Remove a review only if it shares personal data or is abusive. Every removal is logged with your email."
      />
      {(reviews ?? []).length === 0 ? (
        <p className="rounded-2xl border border-border bg-card p-10 text-center text-sm text-muted-foreground gs-elev-1">No reviews yet.</p>
      ) : (
        <ul className="space-y-3">
          {(reviews ?? []).map((review) => (
            <li key={review.id} className="space-y-3 rounded-2xl border border-border bg-card p-5 gs-elev-1">
              <p className="text-sm">
                <span className="font-semibold">{nameById.get(review.photographer_id) ?? 'Photographer'}</span>
                <span className="text-muted-foreground">
                  , {review.rating}/5, {formatMessageTime(review.created_at)}
                </span>
              </p>
              {review.body && <p className="text-sm whitespace-pre-line">{review.body}</p>}
              {review.removed_at ? (
                <p className="text-sm text-muted-foreground">
                  Removed ({review.removed_reason === 'personal_data' ? 'personal data' : 'abuse'})
                </p>
              ) : (
                <form action={removeReview} className="flex flex-wrap items-center gap-2">
                  <input type="hidden" name="reviewId" value={review.id} />
                  <label htmlFor={`reason-${review.id}`} className="sr-only">
                    Reason for removing
                  </label>
                  <select id={`reason-${review.id}`} name="reason" className={FIELD} defaultValue="personal_data">
                    <option value="personal_data">Personal data</option>
                    <option value="abuse">Abuse</option>
                  </select>
                  <Button type="submit" variant="destructive" className="h-11 px-4">
                    Remove review
                  </Button>
                </form>
              )}
            </li>
          ))}
        </ul>
      )}
    </>
  )
}
