import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse, type NextRequest } from 'next/server'
import { safeNextPath } from '@/lib/url'
import { isAdminEmail } from '@/lib/admin-email'
import { afterSignInPath } from '@/lib/routing'
import type { Database } from '@/types/database'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const error = requestUrl.searchParams.get('error')
  const origin = requestUrl.origin
  // e.g. a /reclamar invite the user signed up from
  const next = safeNextPath(requestUrl.searchParams.get('next'))

  if (error) {
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent(error)}`
    )
  }

  if (!code) {
    return NextResponse.redirect(`${origin}/login`)
  }

  const cookieStore = await cookies()
  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        },
      },
    }
  )

  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)

  if (exchangeError) {
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent(exchangeError.message)}`
    )
  }

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.redirect(`${origin}/login`)
  }

  // Admins (ADMIN_EMAILS) have no profile and go to /admin. Everyone else:
  // no profile yet = new Google user who still has to pick a role.
  const isAdmin = isAdminEmail(user.email)
  const { data: profile } = isAdmin
    ? { data: null }
    : await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle()

  return NextResponse.redirect(
    `${origin}${afterSignInPath({ isAdmin, role: profile?.role ?? null }, next)}`
  )
}
