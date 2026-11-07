'use server'

import { revalidatePath } from 'next/cache'
import { requireAdmin } from '@/lib/admin'
import { createServiceClient } from '@/lib/supabase/service'
import { dedupe, parseLines } from '@/lib/leads/parse'
import { LEAD_ESTADOS, type LeadEstado } from '@/types/database'

const MAX_IMPORT_CHARS = 10_000
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

export type ImportResult = {
  error: string | null
  added: string[]
  duplicates: string[]
  invalid: string[]
}

// Pasted Instagram handles/URLs become 'encontrado' leads. Nothing is fetched
// from instagram.com: the text is only parsed.
export async function importLeads(text: string): Promise<ImportResult> {
  await requireAdmin()

  const { handles, invalid } = parseLines(String(text ?? '').slice(0, MAX_IMPORT_CHARS))
  if (handles.length === 0) {
    return { error: 'No valid Instagram handles found.', added: [], duplicates: [], invalid }
  }

  const supabase = createServiceClient()
  // Every existing lead counts, including no_contactar ones.
  const { data: existing, error: readError } = await supabase
    .from('leads')
    .select('instagram_handle')
    .not('instagram_handle', 'is', null)
  if (readError) {
    console.error('Reading leads for import failed:', readError)
    return { error: "Couldn't read existing leads. Try again.", added: [], duplicates: [], invalid }
  }

  const fresh = dedupe(handles, (existing ?? []).map((row) => row.instagram_handle))
  const duplicates = handles.filter((h) => !fresh.includes(h))
  if (fresh.length > 0) {
    const { error } = await supabase.from('leads').insert(
      fresh.map((handle) => ({
        nombre: `@${handle}`,
        instagram_handle: handle,
        fuente: 'importado',
        prioridad: null,
        estado: 'encontrado' as const,
      }))
    )
    if (error) {
      console.error('Lead import failed:', error)
      return { error: "Couldn't import the leads. Try again.", added: [], duplicates, invalid }
    }
  }

  revalidatePath('/admin/leads')
  return { error: null, added: fresh, duplicates, invalid }
}
