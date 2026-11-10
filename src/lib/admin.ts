import { cache } from 'react'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { isAdminEmail } from '@/lib/admin-email'

export { isAdminEmail }

// The admin layout and each admin page both check; cache() makes that one
// auth request per render.
const currentUserEmail = cache(async (): Promise<string | null> => {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return user?.email ?? null
})

// For admin pages and actions: anyone who isn't a signed-in admin gets a 404,
// so the admin area doesn't reveal that it exists.
export async function requireAdmin(): Promise<void> {
  if (!isAdminEmail(await currentUserEmail())) notFound()
}
