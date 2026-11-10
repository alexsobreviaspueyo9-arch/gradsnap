import type { UserRole } from '@/types/database'

export const ADMIN_HOME = '/admin'
export const ONBOARDING_HOME = '/onboarding/select-role'

export const DASHBOARD_BASE: Record<UserRole, string> = {
  client: '/dashboard/client',
  photographer: '/dashboard/photographer',
}

// Admin previews mirror the dashboard routes under these prefixes.
export const PREVIEW_BASE: Record<UserRole, string> = {
  client: '/admin/preview/client',
  photographer: '/admin/preview/photographer',
}

// Admins come from ADMIN_EMAILS and have no profiles row, so no role.
export type Viewer = { isAdmin: boolean; role: UserRole | null }

function isUnder(pathname: string, base: string): boolean {
  return pathname === base || pathname.startsWith(`${base}/`)
}

export function homePath({ isAdmin, role }: Viewer): string {
  if (isAdmin) return ADMIN_HOME
  return role ? DASHBOARD_BASE[role] : ONBOARDING_HOME
}

// Where the proxy sends a signed-in user, or null to let the request through.
export function redirectFor(pathname: string, viewer: Viewer): string | null {
  const home = homePath(viewer)
  if (pathname === '/login' || pathname === '/register') return home

  if (viewer.isAdmin) {
    const isRoleArea = isUnder(pathname, '/dashboard') || isUnder(pathname, '/onboarding')
    return isRoleArea ? home : null
  }

  if (isUnder(pathname, '/dashboard')) {
    const allowed = viewer.role ? DASHBOARD_BASE[viewer.role] : null
    return allowed && pathname.startsWith(allowed) ? null : home
  }
  return null
}

// After an OAuth or email-confirmation round trip. A safe ?next= wins, but
// admins only follow it inside /admin, and users without a role pick one first.
export function afterSignInPath(viewer: Viewer, next: string | null): string {
  if (viewer.isAdmin) return next && isUnder(next.split('?')[0], ADMIN_HOME) ? next : ADMIN_HOME
  if (!viewer.role) {
    return next ? `${ONBOARDING_HOME}?next=${encodeURIComponent(next)}` : ONBOARDING_HOME
  }
  return next ?? homePath(viewer)
}

// "/dashboard/client/messages" -> "/admin/preview/client/messages".
export function toPreviewHref(href: string, role: UserRole): string {
  const base = DASHBOARD_BASE[role]
  return isUnder(href, base) ? PREVIEW_BASE[role] + href.slice(base.length) : href
}
