#!/usr/bin/env node
// Finds new graduation/portrait photographer leads around Virginia Tech and
// adds them to public.leads. Usage:
//   node scripts/find-leads.mjs --dry-run   # print, don't insert
//   node scripts/find-leads.mjs             # insert new leads
//
// The search runs in headless Claude Code (Haiku) with only WebSearch and
// WebFetch. It never logs in anywhere and never sends messages: it only
// reads public pages and writes drafts for a human to review in /admin/leads.
// SUPABASE_SERVICE_ROLE_KEY is read from .env.local here and never leaves
// this process (it's not part of the prompt).

import {
  LINK_PLACEHOLDER,
  MAX_DRAFT_WORDS,
  SITE,
  fail,
  hostOf,
  loadSupabase,
  normalizeEmail,
  normalizeHandle,
  normalizeWebsite,
  pageMentionsHandle,
  publicPagesText,
  runClaude,
  wordCount,
} from './lib/leads-shared.mjs'

const MAX_SEARCHES = 8
const MAX_NEW_LEADS = 15
const MAX_FETCHES = MAX_NEW_LEADS // 1 fetch per lead
// The prompt asks for less than the hard caps: the model tends to overshoot
// whatever number it is given, and crossing a hard cap throws the run away.
const PROMPT_SEARCHES = 6
const PROMPT_FETCHES = 8
const MAX_BUDGET_USD = '0.50'
const ZONES = ['Blacksburg', 'Radford', 'Roanoke']

const isDryRun = process.argv.includes('--dry-run')

// ── helpers ──────────────────────────────────────────────────────────────

// The channel we'd contact them on decides the ?src= of their link.
function channelFor(lead) {
  if (lead.contact_email) return 'email'
  if (lead.instagram_handle) return 'instagram'
  return 'web'
}

// ── existing leads ───────────────────────────────────────────────────────

async function loadExisting(supabase) {
  const { data, error } = await supabase.from('leads').select('website, instagram_handle, estado')
  if (error) fail(`Could not read existing leads: ${error.message}`)
  const hosts = new Set()
  const handles = new Set()
  for (const row of data) {
    const website = normalizeWebsite(row.website)
    if (website) hosts.add(hostOf(website))
    const handle = normalizeHandle(row.instagram_handle)
    if (handle) handles.add(handle)
  }
  return { hosts, handles }
}

// ── the search (headless Claude Code) ────────────────────────────────────

const LEAD_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['leads'],
  properties: {
    leads: {
      type: 'array',
      maxItems: MAX_NEW_LEADS,
      items: {
        type: 'object',
        additionalProperties: false,
        required: [
          'nombre', 'instagram_handle', 'website', 'contact_email', 'zona',
          'fuente', 'prioridad', 'motivo_encaje', 'borrador_mensaje',
        ],
        properties: {
          nombre: { type: 'string' },
          instagram_handle: { type: ['string', 'null'] },
          website: { type: ['string', 'null'] },
          contact_email: { type: ['string', 'null'] },
          zona: { type: 'string', enum: ZONES },
          fuente: { type: 'string' },
          prioridad: { type: 'string', enum: ['A', 'B', 'C'] },
          motivo_encaje: { type: 'string' },
          borrador_mensaje: { type: 'string' },
        },
      },
    },
  },
}

function buildPrompt({ hosts, handles }) {
  const skip = [...hosts, ...[...handles].map((h) => `@${h}`)].slice(0, 300)
  return `Find graduation, senior or portrait photographers who work in ${ZONES.join(', ')} (Virginia, near Virginia Tech and Radford University).

BUDGET (strict, the run is cancelled if you exceed it): at most ${PROMPT_SEARCHES} WebSearch calls and at most ${PROMPT_FETCHES} WebFetch calls in total, never more than 1 WebFetch per photographer and never retry a failed fetch. Prefer what the search results already show; only fetch a photographer's own site when you need a detail for the message. Keep count as you go. Return at most ${MAX_NEW_LEADS} photographers.

RULES
SEARCH STRATEGY: split your searches between (a) photographer websites and (b) Instagram accounts that appear in web search results, e.g. site:instagram.com queries with hashtags or city terms such as "#vtgrad", "#hokiegrad", "#virginiatechgrad", "#radforduniversity", "Blacksburg graduation photographer", "Roanoke senior photographer". Take Instagram handles only from the result URLs or snippets; never open them.

- Only public pages found through web search. Never fetch instagram.com, never log in anywhere, never contact anyone.
- Only include photographers with a public website or an Instagram account that appeared in your search results.
- Never invent data. If a field isn't published, use null. contact_email only if it is printed on their own website.
- Skip these, they are already known: ${skip.length ? skip.join(', ') : '(none)'}.

FIELDS
- nombre: business or photographer name.
- instagram_handle: handle without @ if their site or a search result shows it, else null. For a photographer found only on Instagram, this is required and website is null.
- website: their own site URL, else null.
- contact_email: see rules, else null.
- zona: one of ${ZONES.join(', ')} (closest).
- fuente: the URL where you found them.
- prioridad: A, B or C. A = recent activity, strong portfolio, clearly does graduation sessions, visible prices, close to campus. C = weak on most of those.
- motivo_encaje: one sentence with a real, specific detail of their work you saw.
- borrador_mensaje: a friendly first message in English, at most ${MAX_DRAFT_WORDS} words, that mentions that detail, says GradSnap (a site where Virginia Tech grads book graduation photographers) is free for photographers while we validate it, includes the literal text ${LINK_PLACEHOLDER} where the sign-up link goes, and ends with one line saying they can reply "stop" to not get more messages.

Return only the JSON object.`
}

// ── validation ───────────────────────────────────────────────────────────

function cleanLead(raw) {
  const nombre = String(raw.nombre ?? '').trim()
  const website = normalizeWebsite(raw.website)
  const instagram_handle = normalizeHandle(raw.instagram_handle)
  const contact_email = normalizeEmail(raw.contact_email)
  const fuente = normalizeWebsite(raw.fuente) ?? String(raw.fuente ?? '').trim()
  const motivo_encaje = String(raw.motivo_encaje ?? '').trim()
  let draft = String(raw.borrador_mensaje ?? '').trim()

  if (!nombre) return { error: 'missing name' }
  if (!website && !instagram_handle) return { error: 'no public website or handle' }
  if (!ZONES.includes(raw.zona)) return { error: `zone "${raw.zona}"` }
  if (!['A', 'B', 'C'].includes(raw.prioridad)) return { error: 'bad priority' }
  if (!motivo_encaje) return { error: 'missing fit reason' }
  if (!draft.includes(LINK_PLACEHOLDER)) return { error: 'draft has no link placeholder' }

  const lead = {
    nombre,
    instagram_handle,
    website,
    contact_email,
    zona: raw.zona,
    fuente: fuente || null,
    prioridad: raw.prioridad,
    motivo_encaje,
  }
  return { lead, draft }
}

// "No invented data": the email and the handle are kept only if they really
// appear on the photographer's public pages (their site and the page where
// they were found). Instagram itself is never fetched.
// A handle also counts if it appeared in the raw search results (Instagram-only
// photographers), which come straight from the search tool, not the model.
async function verifyPublicData(lead, searchResults) {
  const pages = await publicPagesText([lead.website, lead.fuente])
  const handleSeen = pageMentionsHandle(`${pages}\n${searchResults}`, lead.instagram_handle)
  return {
    ...lead,
    contact_email: lead.contact_email && pages.includes(lead.contact_email) ? lead.contact_email : null,
    instagram_handle: handleSeen ? lead.instagram_handle : null,
  }
}

function finishDraft(lead, draft) {
  const text = draft.replace(LINK_PLACEHOLDER, `${SITE}/fotografos?src=${channelFor(lead)}`)
  return wordCount(text) > MAX_DRAFT_WORDS ? null : text
}

async function selectNew(rawLeads, existing, searchResults) {
  const hosts = new Set(existing.hosts)
  const handles = new Set(existing.handles)
  const accepted = []
  const rejected = []
  for (const raw of rawLeads.slice(0, MAX_NEW_LEADS)) {
    const label = raw?.nombre ?? '(no name)'
    const cleaned = cleanLead(raw)
    if (cleaned.error) {
      rejected.push(`${label}: ${cleaned.error}`)
      continue
    }
    const lead = await verifyPublicData(cleaned.lead, searchResults)
    if (!lead.website && !lead.instagram_handle) {
      rejected.push(`${label}: no verifiable website or handle`)
      continue
    }
    const host = hostOf(lead.website)
    if ((host && hosts.has(host)) || (lead.instagram_handle && handles.has(lead.instagram_handle))) {
      rejected.push(`${label}: already in leads (or a duplicate in this run)`)
      continue
    }
    const borrador_mensaje = finishDraft(lead, cleaned.draft)
    if (!borrador_mensaje) {
      rejected.push(`${label}: draft over ${MAX_DRAFT_WORDS} words`)
      continue
    }
    if (host) hosts.add(host)
    if (lead.instagram_handle) handles.add(lead.instagram_handle)
    accepted.push({ ...lead, borrador_mensaje, estado: 'encontrado' })
  }
  return { accepted, rejected }
}

// ── main ─────────────────────────────────────────────────────────────────

const supabase = loadSupabase()
const existing = await loadExisting(supabase)
console.log(`Known leads: ${existing.hosts.size} websites, ${existing.handles.size} handles. Searching…`)

let run
try {
  run = await runClaude({
    prompt: buildPrompt(existing),
    schema: LEAD_SCHEMA,
    limits: { WebSearch: MAX_SEARCHES, WebFetch: MAX_FETCHES },
    budgetUsd: MAX_BUDGET_USD,
  })
} catch (error) {
  fail(`${error.message} Nothing was inserted.`)
}
const rawLeads = Array.isArray(run.payload?.leads) ? run.payload.leads : []
const { cost, counts } = run
const searches = counts.WebSearch
const fetches = counts.WebFetch
const { accepted, rejected } = await selectNew(rawLeads, existing, run.toolResults)
for (const reason of rejected) console.log(`  skipped ${reason}`)

if (isDryRun) {
  console.log(JSON.stringify(accepted, null, 2))
} else if (accepted.length > 0) {
  const { error } = await supabase.from('leads').insert(accepted)
  // A unique-index clash means someone added the same lead meanwhile; nothing was inserted.
  if (error) fail(`Insert failed: ${error.message}`)
}

console.log(
  `${isDryRun ? 'Dry run' : 'Inserted'}: ${accepted.length} new lead(s), ${rejected.length} skipped` +
    ` · searches: ${searches}/${MAX_SEARCHES} · fetches: ${fetches}/${MAX_FETCHES} · cost: $${cost?.toFixed?.(3) ?? '?'}`
)
