'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { requireAdmin } from '@/lib/admin'
import { isUuid } from '@/lib/guest-booking'
import type { ReviewRemovalReason } from '@/types/database'

const REASONS: readonly ReviewRemovalReason[] = ['personal_data', 'abuse']

// Only for policy violations (personal data, abuse). remove_review() keeps
// the row (hidden) and logs which admin removed it and why.
export async function removeReview(formData: FormData): Promise<void> {
  await requireAdmin()
  const reviewId = String(formData.get('reviewId') ?? '')
  const reason = String(formData.get('reason') ?? '') as ReviewRemovalReason
  if (!isUuid(reviewId) || !REASONS.includes(reason)) throw new Error('Invalid request.')

  const {
    data: { user },
  } = await (await createClient()).auth.getUser()
  const { error } = await createServiceClient().rpc('remove_review', {
    p_review_id: reviewId,
    p_reason: reason,
    p_admin_email: user?.email ?? 'unknown',
  })
  if (error) {
    console.error(`Removing review ${reviewId} failed:`, error.message)
    throw new Error("Couldn't remove the review.")
  }
  revalidatePath('/admin/reviews')
}
