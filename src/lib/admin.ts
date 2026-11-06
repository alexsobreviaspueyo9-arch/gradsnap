import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

// ADMIN_EMAILS is a server-only env var: comma-separated, case-insensitive.
// Unset means nobody is an admin.
export function isAdminEmail(
  email: string | null | undefined,
  adminEmails: string | undefined = process.env.ADMIN_EMAILS
): boolean {
  if (!email || !adminEmails) return false
  const admins = adminEmails
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
  return admins.includes(email.trim().toLowerCase())
}

// For admin pages and actions: anyone who isn't a signed-in admin gets a 404,
// so the admin area doesn't reveal that it exists.
export async function requireAdmin(): Promise<void> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!isAdminEmail(user?.email)) notFound()
}
