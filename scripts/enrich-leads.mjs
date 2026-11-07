#!/usr/bin/env node
// Fills in imported leads (no draft message yet) from public web search.
// Local only. Usage:
//   node scripts/enrich-leads.mjs --dry-run   # print, don't update
//   node scripts/enrich-leads.mjs             # update the leads
//
// One headless Claude Code run (Haiku, WebSearch only) per lead, killed past
// 2 searches; at most 15 leads per run. Instagram is never opened. The website
// is kept only if it links back to the lead's Instagram handle, and the email
// only if it is printed on that website: anything unverified stays null.

import {
  LINK_PLACEHOLDER,
  MAX_DRAFT_WORDS,
  SITE,
  fail,
  loadSupabase,
  normalizeEmail,
  normalizeWebsite,
  pageMentionsHandle,
  publicPagesText,
  runClaude,
  wordCount,
} from './lib/leads-shared.mjs'

const MAX_LEADS = 15
const MAX_SEARCHES_PER_LEAD = 2
const BUDGET_PER_LEAD_USD = '0.10'
const NOT_FOUND_NOTE = 'Enriquecimiento: sin información pública'

const isDryRun = process.argv.includes('--dry-run')

const SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['found', 'website', 'contact_email', 'prioridad', 'motivo_encaje', 'borrador_mensaje'],
  properties: {
    found: { type: 'boolean' },
    website: { type: ['string', 'null'] },
    contact_email: { type: ['string', 'null'] },
    prioridad: { type: ['string', 'null'], enum: ['A', 'B', 'C', null] },
    motivo_encaje: { type: ['string', 'null'] },
    borrador_mensaje: { type: ['string', 'null'] },
  },
}

function buildPrompt(lead) {
  return `Research the photographer with the Instagram handle @${lead.instagram_handle}${lead.zona ? ` (area: ${lead.zona}, Virginia)` : ''} using web search only. Do not open instagram.com and do not contact anyone.

BUDGET (strict, the run is cancelled if you exceed it): use 1 WebSearch; use a second one only if the first found nothing about this photographer. Never more than ${MAX_SEARCHES_PER_LEAD}.

Never invent data. If you can't find this specific photographer, return found=false and null for everything else.

FIELDS
- website: their own website if a search result shows it, else null.
- contact_email: only if it is published on their website, else null.
- prioridad: A, B or C. A = recent activity, strong portfolio, clearly does graduation/senior sessions, visible prices, near Virginia Tech. C = weak on most of those.
- motivo_encaje: one sentence with a real, specific detail of their work you saw.
- borrador_mensaje: a friendly first message in English, at most ${MAX_DRAFT_WORDS} words, that mentions that detail, says GradSnap (a site where Virginia Tech grads book graduation photographers) is free for photographers while we validate it, includes the literal text ${LINK_PLACEHOLDER} where the sign-up link goes, and ends with one line saying they can reply "stop" to not get more messages.

Return only the JSON object.`
}

// Returns { patch } to apply, { note } for "not found", or { error }.
async function enrich(lead, payload) {
  if (!payload?.found) return { note: NOT_FOUND_NOTE }

  const motivo = String(payload.motivo_encaje ?? '').trim()
  const draft = String(payload.borrador_mensaje ?? '').trim()
  if (!['A', 'B', 'C'].includes(payload.prioridad)) return { error: 'bad priority' }
  if (!motivo) return { error: 'missing fit reason' }
  if (!draft.includes(LINK_PLACEHOLDER)) return { error: 'draft has no link placeholder' }

  const borrador = draft.replace(LINK_PLACEHOLDER, `${SITE}/fotografos?src=instagram`)
  if (wordCount(borrador) > MAX_DRAFT_WORDS) return { error: `draft has ${wordCount(borrador)} words` }

  // The site only counts as theirs if it links back to their handle.
  let website = normalizeWebsite(payload.website)
  let email = normalizeEmail(payload.contact_email)
  if (website) {
    const pages = await publicPagesText([website])
    if (!pageMentionsHandle(pages, lead.instagram_handle)) website = null
    else if (email && !pages.includes(email)) email = null
  }
  if (!website) email = null

  return {
    patch: {
      website: website ?? lead.website,
      contact_email: email ?? lead.contact_email,
      prioridad: payload.prioridad,
      motivo_encaje: motivo,
      borrador_mensaje: borrador,
    },
  }
}

// ── main ─────────────────────────────────────────────────────────────────

const supabase = loadSupabase()
const { data: leads, error } = await supabase
  .from('leads')
  .select('id, nombre, instagram_handle, website, contact_email, zona, notas')
  .is('borrador_mensaje', null)
  .neq('estado', 'no_contactar')
  .not('instagram_handle', 'is', null)
  .order('created_at', { ascending: true })
  .limit(MAX_LEADS * 2)
if (error) fail(`Could not read leads: ${error.message}`)

const pending = leads.filter((l) => !(l.notas ?? '').startsWith(NOT_FOUND_NOTE)).slice(0, MAX_LEADS)
console.log(`${pending.length} lead(s) to enrich.`)

let totalCost = 0
let updated = 0
for (const lead of pending) {
  const label = `@${lead.instagram_handle}`
  let run
  try {
    run = await runClaude({
      prompt: buildPrompt(lead),
      schema: SCHEMA,
      limits: { WebSearch: MAX_SEARCHES_PER_LEAD },
      budgetUsd: BUDGET_PER_LEAD_USD,
    })
  } catch (runError) {
    console.log(`  ${label}: skipped, ${runError.message}`)
    continue
  }
  totalCost += run.cost

  const result = await enrich(lead, run.payload)
  if (result.error) {
    console.log(`  ${label}: skipped, ${result.error}`)
    continue
  }
  const patch = result.patch ?? { notas: [lead.notas, result.note].filter(Boolean).join('\n') }
  if (isDryRun) {
    console.log(`  ${label}:`, JSON.stringify(patch, null, 2))
  } else {
    const { error: updateError } = await supabase.from('leads').update(patch).eq('id', lead.id)
    if (updateError) {
      console.log(`  ${label}: update failed, ${updateError.message}`)
      continue
    }
    console.log(`  ${label}: ${result.patch ? `enriched (${patch.prioridad})` : 'nothing public found'}`)
  }
  updated += 1
}

console.log(`${isDryRun ? 'Dry run' : 'Done'}: ${updated}/${pending.length} lead(s) · cost: $${totalCost.toFixed(3)}`)
