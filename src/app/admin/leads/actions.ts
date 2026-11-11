'use server'

import { randomBytes } from 'node:crypto'
import { revalidatePath } from 'next/cache'
import { requireAdmin } from '@/lib/admin'
import { createServiceClient } from '@/lib/supabase/service'
import { dedupe, parseLines } from '@/lib/leads/parse'
import { SITE_URL } from '@/lib/site'
import { normalizeHttpUrl } from '@/lib/url'
import { LEAD_ESTADOS, type LeadEstado, type SignupSrc } from '@/types/database'

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

const INVITE_DAYS = 14
const DAY_MS = 24 * 60 * 60 * 1000

function inviteChannel(lead: { contact_email: string | null; instagram_handle: string | null }): SignupSrc {
  if (lead.contact_email) return 'email'
  if (lead.instagram_handle) return 'instagram'
  return 'web'
}

// Concierge: a lead that replied gets a draft photographer profile and a
// one-time claim link (14 days). Only name, area, Instagram and website are
// copied: never photos or bio. Nothing is emailed; the admin sends the link.
// Asking again for the same lead issues a fresh link for the same draft.
export async function createDraftProfile(
  leadId: string
): Promise<{ error: string | null; link: string | null }> {
  await requireAdmin()
  if (!UUID_RE.test(leadId)) return { error: 'Invalid lead.', link: null }

  const supabase = createServiceClient()
  const { data: lead } = await supabase
    .from('leads')
    .select('id, nombre, zona, instagram_handle, website, contact_email, estado')
    .eq('id', leadId)
    .single()
  if (!lead || lead.estado !== 'respondio') {
    return { error: 'Only leads in "Replied" can get a draft profile.', link: null }
  }

  const token = randomBytes(32).toString('base64url')
  const expiresAt = new Date(Date.now() + INVITE_DAYS * DAY_MS).toISOString()
  const website = normalizeHttpUrl(lead.website)

  const { data: existing } = await supabase
    .from('photographer_profiles')
    .select('id, status')
    .eq('lead_id', lead.id)
    .maybeSingle()
  if (existing?.status === 'claimed') {
    return { error: 'This photographer already claimed their profile.', link: null }
  }

  const { error } = existing
    ? await supabase
        .from('photographer_profiles')
        .update({ invite_token: token, invite_expires_at: expiresAt })
        .eq('id', existing.id)
    : await supabase.from('photographer_profiles').insert({
        status: 'draft',
        lead_id: lead.id,
        display_name: lead.nombre.replace(/^@/, '') || null,
        city: lead.zona,
        instagram_url: lead.instagram_handle ? `https://instagram.com/${lead.instagram_handle}` : null,
        social_links: website ? [{ label: 'Website', url: website }] : [],
        invite_token: token,
        invite_expires_at: expiresAt,
      })
  if (error) {
    console.error('Creating draft profile failed:', error)
    return { error: "Couldn't create the draft profile. Try again.", link: null }
  }

  return { error: null, link: `${SITE_URL}/reclamar/${token}?src=${inviteChannel(lead)}` }
}
