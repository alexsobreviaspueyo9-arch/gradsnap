'use server'

import { revalidatePath } from 'next/cache'
import { requireAdmin } from '@/lib/admin'
import { createServiceClient } from '@/lib/supabase/service'
import { LEAD_ESTADOS, type LeadEstado } from '@/types/database'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// Every call re-checks admin: server actions are public endpoints.
export async function setLeadEstado(
  leadId: string,
  estado: LeadEstado
): Promise<{ error: string | null }> {
  await requireAdmin()

  if (!UUID_RE.test(leadId) || !LEAD_ESTADOS.includes(estado)) {
    return { error: 'Invalid lead or status.' }
  }

  const supabase = createServiceClient()
  const patch =
    estado === 'contactado'
      ? { estado, contacted_at: new Date().toISOString() }
      : { estado }
  const { error } = await supabase.from('leads').update(patch).eq('id', leadId)

  if (error) {
    console.error('Lead status update failed:', error)
    return { error: "Couldn't update the lead. Try again." }
  }

  revalidatePath('/admin/leads')
  return { error: null }
}
