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

import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createClient } from '@supabase/supabase-js'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const SITE = 'https://www.gradsnap.app'
const MAX_SEARCHES = 8
const MAX_NEW_LEADS = 15
const MAX_FETCHES = MAX_NEW_LEADS // 1 fetch per lead
// The prompt asks for less than the hard caps: the model tends to overshoot
// whatever number it is given, and crossing a hard cap throws the run away.
const PROMPT_SEARCHES = 6
const PROMPT_FETCHES = 8
const MAX_BUDGET_USD = '0.50'
const MAX_DRAFT_WORDS = 60
const ZONES = ['Blacksburg', 'Radford', 'Roanoke']
const LINK_PLACEHOLDER = '{LINK}'
const CLAUDE_TIMEOUT_MS = 10 * 60 * 1000

const isDryRun = process.argv.includes('--dry-run')

// ── helpers ──────────────────────────────────────────────────────────────

function fail(message) {
  console.error(`✖ ${message}`)
  process.exit(1)
}

// "https://www.Site.com/path/" -> "https://site.com/path" (same site, one key).
function normalizeWebsite(value) {
  if (!value) return null
  try {
    const url = new URL(/^https?:\/\//i.test(value) ? value : `https://${value}`)
    if (!['http:', 'https:'].includes(url.protocol)) return null
    const host = url.hostname.toLowerCase().replace(/^www\./, '')
    if (host.endsWith('instagram.com')) return null
    const path = url.pathname.replace(/\/+$/, '')
    return `https://${host}${path}`
  } catch {
    return null
  }
}

function hostOf(website) {
  return website ? new URL(website).hostname : null
}

function normalizeHandle(value) {
  if (!value) return null
  const handle = String(value)
    .trim()
    .replace(/^https?:\/\/(www\.)?instagram\.com\//i, '')
    .replace(/^@/, '')
    .replace(/\/.*$/, '')
    .toLowerCase()
  return /^[a-z0-9._]{1,30}$/.test(handle) ? handle : null
}

function normalizeEmail(value) {
  if (!value) return null
  const email = String(value).trim().toLowerCase()
  return /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/.test(email) ? email : null
}

// The channel we'd contact them on decides the ?src= of their link.
function channelFor(lead) {
  if (lead.contact_email) return 'email'
  if (lead.instagram_handle) return 'instagram'
  return 'web'
}

function wordCount(text) {
  return text.trim().split(/\s+/).filter(Boolean).length
}

// ── existing leads ───────────────────────────────────────────────────────

// Locally the keys come from .env.local; in GitHub Actions there is no such
// file and they arrive as environment variables (repository secrets).
function loadEnv() {
  if (existsSync(join(ROOT, '.env.local'))) process.loadEnvFile(join(ROOT, '.env.local'))
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    fail('NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set (.env.local or environment).')
  }
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
}

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
- Only public pages found through web search. Never fetch instagram.com, never log in anywhere, never contact anyone.
- Only include photographers with a public website or public profile page that you actually saw.
- Never invent data. If a field isn't published, use null. contact_email only if it is printed on their own website.
- Skip these, they are already known: ${skip.length ? skip.join(', ') : '(none)'}.

FIELDS
- nombre: business or photographer name.
- instagram_handle: handle without @ if their site or a search result shows it, else null.
- website: their own site URL, else null.
- contact_email: see rules, else null.
- zona: one of ${ZONES.join(', ')} (closest).
- fuente: the URL where you found them.
- prioridad: A, B or C. A = recent activity, strong portfolio, clearly does graduation sessions, visible prices, close to campus. C = weak on most of those.
- motivo_encaje: one sentence with a real, specific detail of their work you saw.
- borrador_mensaje: a friendly first message in English, at most ${MAX_DRAFT_WORDS} words, that mentions that detail, says GradSnap (a site where Virginia Tech grads book graduation photographers) is free for photographers while we validate it, includes the literal text ${LINK_PLACEHOLDER} where the sign-up link goes, and ends with one line saying they can reply "stop" to not get more messages.

Return only the JSON object.`
}

// Streams the run so every tool call is counted as it happens; crossing a
// limit kills the run and nothing gets inserted (a hard limit, not a hint).
function runClaude(prompt) {
  const args = [
    '-p',
    '--model', 'haiku',
    '--tools', 'WebSearch,WebFetch',
    '--allowedTools', 'WebSearch,WebFetch',
    '--disallowedTools', 'WebFetch(domain:instagram.com)', 'WebFetch(domain:www.instagram.com)',
    '--permission-mode', 'dontAsk',
    '--strict-mcp-config',
    '--no-session-persistence',
    '--max-budget-usd', MAX_BUDGET_USD,
    '--output-format', 'stream-json',
    '--verbose',
    '--json-schema', JSON.stringify(LEAD_SCHEMA),
  ]
  return new Promise((resolve) => {
    // Run outside the repo so no project settings or CLAUDE.md get loaded.
    const child = spawn('claude', args, { cwd: tmpdir(), stdio: ['pipe', 'pipe', 'pipe'] })
    const counts = { WebSearch: 0, WebFetch: 0 }
    let final = null
    let buffer = ''
    let stderr = ''
    const timer = setTimeout(() => {
      child.kill()
      fail('claude took too long; nothing was inserted.')
    }, CLAUDE_TIMEOUT_MS)

    function handleEvent(event) {
      if (event.type === 'result') {
        final = event
        return
      }
      for (const block of event.message?.content ?? []) {
        if (block.type !== 'tool_use' || !(block.name in counts)) continue
        counts[block.name] += 1
        if (counts.WebSearch > MAX_SEARCHES || counts.WebFetch > MAX_FETCHES) {
          child.kill()
          fail(`Limit crossed (${counts.WebSearch} searches, ${counts.WebFetch} fetches); run stopped, nothing was inserted.`)
        }
      }
    }

    child.stdout.setEncoding('utf8')
    child.stdout.on('data', (chunk) => {
      buffer += chunk
      const lines = buffer.split('\n')
      buffer = lines.pop()
      for (const line of lines) {
        if (!line.trim()) continue
        try {
          handleEvent(JSON.parse(line))
        } catch {
          // Not an event line; ignore.
        }
      }
    })
    child.stderr.on('data', (chunk) => (stderr += chunk))
    child.on('error', (error) => fail(`Could not run claude: ${error.message}`))
    child.on('close', (code) => {
      clearTimeout(timer)
      if (buffer.trim()) {
        try { handleEvent(JSON.parse(buffer)) } catch { /* trailing noise */ }
      }
      if (!final) fail(`claude ended without a result (exit ${code}): ${stderr.slice(0, 500)}`)
      if (final.is_error) fail(`claude reported an error: ${final.subtype ?? ''} ${String(final.result ?? '').slice(0, 300)}`)
      let payload = final.structured_output
      if (!payload) {
        try {
          payload = JSON.parse(String(final.result).replace(/^```(json)?|```$/gm, ''))
        } catch {
          fail('Could not parse the leads JSON from claude.')
        }
      }
      resolve({
        leads: Array.isArray(payload?.leads) ? payload.leads : [],
        cost: final.total_cost_usd,
        searches: counts.WebSearch,
        fetches: counts.WebFetch,
      })
    })
    child.stdin.end(prompt)
  })
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

const PAGE_TIMEOUT_MS = 10_000

async function fetchPageText(url) {
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(PAGE_TIMEOUT_MS),
      headers: { 'user-agent': 'Mozilla/5.0 (compatible; GradSnapLeadCheck/1.0)' },
    })
    return res.ok ? (await res.text()).toLowerCase() : ''
  } catch {
    return ''
  }
}

// "No invented data": the email and the handle are kept only if they really
// appear on the photographer's public pages (their site and the page where
// they were found). Instagram itself is never fetched.
async function verifyPublicData(lead) {
  const urls = [...new Set([lead.website, lead.fuente].filter((u) => u?.startsWith('http')))]
  const pages = (await Promise.all(urls.map(fetchPageText))).join('\n')
  const handleSeen =
    lead.instagram_handle &&
    (pages.includes(`instagram.com/${lead.instagram_handle}`) || pages.includes(`@${lead.instagram_handle}`))
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

async function selectNew(rawLeads, existing) {
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
    const lead = await verifyPublicData(cleaned.lead)
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

const supabase = loadEnv()
const existing = await loadExisting(supabase)
console.log(`Known leads: ${existing.hosts.size} websites, ${existing.handles.size} handles. Searching…`)

const { leads: rawLeads, cost, searches, fetches } = await runClaude(buildPrompt(existing))
const { accepted, rejected } = await selectNew(rawLeads, existing)
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
