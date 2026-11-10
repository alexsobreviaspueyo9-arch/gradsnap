import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { isAdminEmail } from '@/lib/admin-email'
import { redirectFor } from '@/lib/routing'
import type { UserRole } from '@/types/database'

// When Supabase is unreachable (e.g. a paused project), auth-js keeps
// retrying a session refresh for ~26s, freezing every navigation. Past this
// limit the request continues as signed out: public pages still render and
// protected ones redirect to /login (fail closed).
const AUTH_TIMEOUT_MS = 5000

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Refresh session — do not add logic between createServerClient and getUser
  const user = await Promise.race([
    supabase.auth.getUser().then(({ data }) => data.user),
    new Promise<null>((resolve) => setTimeout(() => resolve(null), AUTH_TIMEOUT_MS)),
  ])

  const { pathname } = request.nextUrl

  // Redirect unauthenticated users away from protected routes
  if (
    !user &&
    (pathname.startsWith('/dashboard') || pathname.startsWith('/onboarding'))
  ) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  const isAuthPage = pathname === '/login' || pathname === '/register'
  const isDashboard = pathname.startsWith('/dashboard')
  const isOnboarding = pathname.startsWith('/onboarding')
  if (!user || !(isAuthPage || isDashboard || isOnboarding)) {
    return supabaseResponse
  }

  // Admins come from ADMIN_EMAILS and have no profile; they live in /admin.
  const isAdmin = isAdminEmail(user.email)

  // Role comes from profiles, not user_metadata: users can rewrite their own
  // metadata with supabase.auth.updateUser(), but profiles.role is locked by
  // the guard_profile trigger. Onboarding never needs it.
  let role: UserRole | null = null
  if (!isAdmin && (isAuthPage || isDashboard)) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle()
    role = (profile?.role as UserRole | undefined) ?? null
  }

  const target = redirectFor(pathname, { isAdmin, role })
  return target ? NextResponse.redirect(new URL(target, request.url)) : supabaseResponse
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
