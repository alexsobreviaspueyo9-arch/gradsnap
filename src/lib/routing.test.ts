import { describe, expect, it } from 'vitest'
import { afterSignInPath, homePath, redirectFor, toPreviewHref, type Viewer } from './routing'

const admin: Viewer = { isAdmin: true, role: null }
const client: Viewer = { isAdmin: false, role: 'client' }
const photographer: Viewer = { isAdmin: false, role: 'photographer' }
const noRole: Viewer = { isAdmin: false, role: null }

describe('homePath', () => {
  it('sends admins to /admin even though they have no role', () => {
    expect(homePath(admin)).toBe('/admin')
  })

  it('sends each role to its dashboard and role-less users to onboarding', () => {
    expect(homePath(client)).toBe('/dashboard/client')
    expect(homePath(photographer)).toBe('/dashboard/photographer')
    expect(homePath(noRole)).toBe('/onboarding/select-role')
  })
})

describe('redirectFor', () => {
  it('moves signed-in users off the auth pages to their home', () => {
    expect(redirectFor('/login', admin)).toBe('/admin')
    expect(redirectFor('/register', client)).toBe('/dashboard/client')
  })

  it('keeps admins out of onboarding and the dashboards', () => {
    expect(redirectFor('/onboarding/select-role', admin)).toBe('/admin')
    expect(redirectFor('/onboarding/photographer/contract', admin)).toBe('/admin')
    expect(redirectFor('/dashboard/client', admin)).toBe('/admin')
  })

  it('lets admins through to the admin area and public pages', () => {
    expect(redirectFor('/admin/preview/client', admin)).toBeNull()
    expect(redirectFor('/', admin)).toBeNull()
  })

  it('keeps each role inside its own dashboard (unchanged behaviour)', () => {
    expect(redirectFor('/dashboard/client/messages', client)).toBeNull()
    expect(redirectFor('/dashboard/photographer', client)).toBe('/dashboard/client')
    expect(redirectFor('/dashboard/client', photographer)).toBe('/dashboard/photographer')
    expect(redirectFor('/dashboard/client', noRole)).toBe('/onboarding/select-role')
  })

  it('leaves onboarding alone for normal users', () => {
    expect(redirectFor('/onboarding/select-role', noRole)).toBeNull()
  })

  it('does not treat look-alike prefixes as the role areas', () => {
    expect(redirectFor('/dashboards', admin)).toBeNull()
    expect(redirectFor('/onboardingx', admin)).toBeNull()
  })
})

describe('afterSignInPath', () => {
  it('lands admins on /admin, following next only inside /admin', () => {
    expect(afterSignInPath(admin, null)).toBe('/admin')
    expect(afterSignInPath(admin, '/admin/leads?estado=respondio')).toBe('/admin/leads?estado=respondio')
    expect(afterSignInPath(admin, '/reclamar/abc')).toBe('/admin')
    expect(afterSignInPath(admin, '/administrator')).toBe('/admin')
  })

  it('sends role-less users to pick a role, carrying next', () => {
    expect(afterSignInPath(noRole, null)).toBe('/onboarding/select-role')
    expect(afterSignInPath(noRole, '/reclamar/abc')).toBe('/onboarding/select-role?next=%2Freclamar%2Fabc')
  })

  it('follows next for users with a role, else their dashboard', () => {
    expect(afterSignInPath(photographer, '/reclamar/abc')).toBe('/reclamar/abc')
    expect(afterSignInPath(client, null)).toBe('/dashboard/client')
  })
})

describe('toPreviewHref', () => {
  it('maps dashboard links to the matching preview route', () => {
    expect(toPreviewHref('/dashboard/client', 'client')).toBe('/admin/preview/client')
    expect(toPreviewHref('/dashboard/photographer/messages?booking=b1', 'photographer')).toBe(
      '/admin/preview/photographer/messages?booking=b1'
    )
  })

  it('leaves other links untouched', () => {
    expect(toPreviewHref('/dashboard/photographer', 'client')).toBe('/dashboard/photographer')
    expect(toPreviewHref('https://example.com', 'client')).toBe('https://example.com')
  })
})
