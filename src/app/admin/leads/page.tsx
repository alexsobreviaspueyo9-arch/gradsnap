import Link from 'next/link'
import type { Metadata } from 'next'
import { requireAdmin } from '@/lib/admin'
import { createServiceClient } from '@/lib/supabase/service'
import { cn } from '@/lib/utils'
import { PageHeader } from '@/components/dashboard/page-header'
import { LeadsTable } from '@/components/admin/leads-table'
import { ImportLeads } from '@/components/admin/import-leads'
import { LEAD_ESTADOS, type Lead, type LeadEstado } from '@/types/database'

export const metadata: Metadata = { title: 'Leads · GradSnap admin' }

const ESTADO_LABELS: Record<LeadEstado, string> = {
  encontrado: 'Found',
  contactado: 'Contacted',
  respondio: 'Replied',
  cuenta_creada: 'Account created',
  perfil_completo: 'Profile complete',
  no_contactar: 'Do not contact',
}

// A, B, C, then leads without a priority yet (imported, not enriched).
function byPriority(a: Lead, b: Lead): number {
  if (a.prioridad === b.prioridad) return b.created_at.localeCompare(a.created_at)
  if (!a.prioridad) return 1
  if (!b.prioridad) return -1
  return a.prioridad.localeCompare(b.prioridad)
}

export default async function AdminLeadsPage({
  searchParams,
}: {
  searchParams: Promise<{ estado?: string }>
}) {
  await requireAdmin()

  const { estado } = await searchParams
  const filter = LEAD_ESTADOS.find((e) => e === estado) ?? null

  const supabase = createServiceClient()
  let query = supabase.from('leads').select('*')
  if (filter) query = query.eq('estado', filter)
  const { data: leads, error } = await query
  if (error) console.error('Loading leads failed:', error)

  const sorted = [...(leads ?? [])].sort(byPriority)
  const groups = LEAD_ESTADOS.filter((e) => !filter || e === filter)
    .map((e) => ({ estado: e, leads: sorted.filter((l) => l.estado === e) }))
    .filter((g) => g.leads.length > 0)

  const tabs = [{ value: null, label: 'All' }, ...LEAD_ESTADOS.map((e) => ({ value: e, label: ESTADO_LABELS[e] }))]

  return (
    <>
      <PageHeader title="Leads" description="Photographers to contact, by status and priority." />

      <ImportLeads />

      <nav aria-label="Filter by status" className="gs-scrollbar-none -mx-4 mb-6 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        <ul className="inline-flex gap-1 rounded-full bg-foreground/[0.06] p-1">
          {tabs.map((tab) => {
            const isActive = tab.value === filter
            return (
              <li key={tab.label}>
                <Link
                  href={tab.value ? `/admin/leads?estado=${tab.value}` : '/admin/leads'}
                  aria-current={isActive ? 'page' : undefined}
                  className={cn(
                    'flex h-11 shrink-0 items-center rounded-full px-4 text-sm font-medium whitespace-nowrap transition-colors',
                    isActive
                      ? 'bg-card text-foreground shadow-[0_1px_3px_var(--shadow-tint)]'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  {tab.label}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      {error && (
        <p className="mb-6 rounded-2xl bg-card p-4 text-sm text-destructive">
          Couldn&apos;t load the leads. Check SUPABASE_SERVICE_ROLE_KEY and that the migration has been run.
        </p>
      )}

      {groups.length === 0 ? (
        <p className="rounded-3xl bg-card p-10 text-center text-sm text-muted-foreground">
          No leads {filter ? `in "${ESTADO_LABELS[filter]}"` : 'yet'}.
        </p>
      ) : (
        <div className="space-y-8">
          {groups.map((group) => (
            <section key={group.estado} aria-labelledby={`estado-${group.estado}`}>
              <h2 id={`estado-${group.estado}`} className="mb-3 text-lg font-semibold tracking-tight">
                {ESTADO_LABELS[group.estado]}{' '}
                <span className="text-muted-foreground tabular-nums">({group.leads.length})</span>
              </h2>
              <LeadsTable leads={group.leads} estadoLabels={ESTADO_LABELS} />
            </section>
          ))}
        </div>
      )}
    </>
  )
}
