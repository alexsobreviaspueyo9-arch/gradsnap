import { Briefcase, GraduationCap, Users } from 'lucide-react'
import { requireAdmin } from '@/lib/admin'
import { PREVIEW_BASE } from '@/lib/routing'
import { PageHeader } from '@/components/dashboard/page-header'
import { ActionTile } from '@/components/dashboard/action-tile'

const TILES = [
  {
    href: PREVIEW_BASE.photographer,
    icon: Briefcase,
    title: 'Preview as a photographer',
    description: 'Overview, profile, portfolio, availability, bookings and messages.',
  },
  {
    href: PREVIEW_BASE.client,
    icon: GraduationCap,
    title: 'Preview as a client',
    description: 'Overview, search and calendar, a photographer page and messages.',
  },
  {
    href: '/admin/leads',
    icon: Users,
    title: 'Leads',
    description: 'Photographers to contact, import, and concierge invites.',
  },
] as const

export default async function AdminHomePage() {
  await requireAdmin()
  return (
    <>
      <PageHeader title="Admin" description="See GradSnap as each role does, and work the leads list." />
      <div className="grid gap-4 md:grid-cols-2">
        {TILES.map((tile) => (
          <ActionTile key={tile.href} {...tile} />
        ))}
      </div>
    </>
  )
}
