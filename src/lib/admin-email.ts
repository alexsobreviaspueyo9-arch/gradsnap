// ADMIN_EMAILS is a server-only env var: comma-separated, case-insensitive.
// Unset means nobody is an admin. Kept free of Next/Supabase imports so the
// proxy can use it too.
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
