import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

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
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl

  // Redirect unauthenticated users away from protected routes
  if (
    !user &&
    (pathname.startsWith('/dashboard') || pathname.startsWith('/onboarding'))
  ) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Redirect authenticated users away from auth pages
  if (user && (pathname === '/login' || pathname === '/register')) {
    const role = user.user_metadata?.role as string | undefined
    if (role === 'photographer') {
      return NextResponse.redirect(
        new URL('/dashboard/photographer', request.url)
      )
    }
    if (role === 'client') {
      return NextResponse.redirect(new URL('/dashboard/client', request.url))
    }
    // Google OAuth user with no role yet
    return NextResponse.redirect(new URL('/onboarding/select-role', request.url))
  }

  // Role-based dashboard protection
  if (user && pathname.startsWith('/dashboard/photographer')) {
    if (user.user_metadata?.role !== 'photographer') {
      return NextResponse.redirect(new URL('/dashboard/client', request.url))
    }
  }

  if (user && pathname.startsWith('/dashboard/client')) {
    if (user.user_metadata?.role !== 'client') {
      return NextResponse.redirect(
        new URL('/dashboard/photographer', request.url)
      )
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
