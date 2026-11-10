import { Eye } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { NAV_BY_ROLE } from '@/components/dashboard-header'
import { DashboardNav } from '@/components/dashboard/dashboard-nav'
import { PREVIEW_BASE, toPreviewHref } from '@/lib/routing'
import type { UserRole } from '@/types/database'

const ROLE_TOGGLE = [
  { href: PREVIEW_BASE.photographer, label: 'Photographer' },
  { href: PREVIEW_BASE.client, label: 'Client' },
] as const

// Above every preview screen: what this is, the role toggle, then the
// role's own dashboard tabs pointing at the preview routes.
export function PreviewBar({ role }: { role: UserRole }) {
  const roleNav = NAV_BY_ROLE[role].map((item) => ({
    ...item,
    href: toPreviewHref(item.href, role),
  }))

  return (
    <div className="mb-8 space-y-4">
      <section
        aria-label="Preview mode"
        className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 rounded-3xl bg-card p-4 sm:px-6"
      >
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-muted">
            <Eye className="size-5" strokeWidth={1.75} aria-hidden />
          </span>
          <div className="min-w-0 space-y-1">
            <Badge variant="secondary">Preview mode</Badge>
            <p className="text-sm text-muted-foreground">
              Sample data. Nothing you do here is saved.
            </p>
          </div>
        </div>
        <DashboardNav items={ROLE_TOGGLE} label="Preview as" tall className="mx-0 px-0 pb-0" />
      </section>
      <DashboardNav
        items={roleNav}
        label={role === 'photographer' ? 'Photographer dashboard' : 'Client dashboard'}
        tall
      />
    </div>
  )
}
