// Shared by scripts/find-leads.mjs and scripts/enrich-leads.mjs: headless
// Claude Code with hard tool-call limits, public-page checks, and the
// service-role Supabase client (key from .env.local or the environment only).

import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createClient } from '@supabase/supabase-js'

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
export const SITE = 'https://www.gradsnap.app'
export const MAX_DRAFT_WORDS = 60
export const LINK_PLACEHOLDER = '{LINK}'

const CLAUDE_TIMEOUT_MS = 10 * 60 * 1000
const PAGE_TIMEOUT_MS = 10_000

export function fail(message) {
  console.error(`✖ ${message}`)
  process.exit(1)
}

// ── normalizing ──────────────────────────────────────────────────────────

// "https://www.Site.com/path/" -> "https://site.com/path" (same site, one key).
export function normalizeWebsite(value) {
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

export function hostOf(website) {
  return website ? new URL(website).hostname : null
}

export function normalizeHandle(value) {
  if (!value) return null
  const handle = String(value)
    .trim()
    .replace(/^https?:\/\/(www\.)?instagram\.com\//i, '')
    .replace(/^@/, '')
    .replace(/\/.*$/, '')
    .toLowerCase()
  return /^[a-z0-9._]{1,30}$/.test(handle) ? handle : null
}

export function normalizeEmail(value) {
  if (!value) return null
  const email = String(value).trim().toLowerCase()
  return /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/.test(email) ? email : null
}

export function wordCount(text) {
  return text.trim().split(/\s+/).filter(Boolean).length
}

// ── Supabase ─────────────────────────────────────────────────────────────

// Locally the keys come from .env.local; in GitHub Actions there is no such
// file and they arrive as environment variables (repository secrets).
export function loadSupabase() {
  if (existsSync(join(ROOT, '.env.local'))) process.loadEnvFile(join(ROOT, '.env.local'))
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    fail('NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set (.env.local or environment).')
  }
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
}

// ── public pages ─────────────────────────────────────────────────────────

export async function fetchPageText(url) {
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

// Lowercased text of the given public pages (Instagram is never fetched).
export async function publicPagesText(urls) {
  const unique = [...new Set(urls.filter((u) => u?.startsWith('http') && !u.includes('instagram.com')))]
  return (await Promise.all(unique.map(fetchPageText))).join('\n')
}

export function pageMentionsHandle(pages, handle) {
  return Boolean(handle) && (pages.includes(`instagram.com/${handle}`) || pages.includes(`@${handle}`))
}

// ── headless Claude Code ─────────────────────────────────────────────────

function toolResultText(content) {
  if (typeof content === 'string') return content
  if (Array.isArray(content)) return content.map((part) => part?.text ?? '').join('\n')
  return ''
}

// Streams the run so every tool call is counted as it happens. Crossing a
// limit kills the run and rejects: callers write nothing for that run.
//   limits: { WebSearch: 8, WebFetch: 15 } — tools not listed are not offered.
export function runClaude({ prompt, schema, limits, budgetUsd }) {
  const tools = Object.keys(limits).join(',')
  const args = [
    '-p',
    '--model', 'haiku',
    '--tools', tools,
    '--allowedTools', tools,
    '--disallowedTools', 'WebFetch(domain:instagram.com)', 'WebFetch(domain:www.instagram.com)',
    '--permission-mode', 'dontAsk',
    '--strict-mcp-config',
    '--no-session-persistence',
    '--max-budget-usd', budgetUsd,
    '--output-format', 'stream-json',
    '--verbose',
    '--json-schema', JSON.stringify(schema),
  ]
  return new Promise((resolve, reject) => {
    // Run outside the repo so no project settings or CLAUDE.md get loaded.
    const child = spawn('claude', args, { cwd: tmpdir(), stdio: ['pipe', 'pipe', 'pipe'] })
    const counts = Object.fromEntries(Object.keys(limits).map((name) => [name, 0]))
    let final = null
    // Raw text the tools returned (search results), so callers can check a
    // value really appeared there instead of trusting the model.
    let toolResults = ''
    let buffer = ''
    let stderr = ''
    let settled = false

    function stop(message) {
      if (settled) return
      settled = true
      child.kill()
      reject(new Error(message))
    }

    const timer = setTimeout(() => stop('claude took too long.'), CLAUDE_TIMEOUT_MS)

    function handleEvent(event) {
      if (event.type === 'result') {
        final = event
        return
      }
      for (const block of event.message?.content ?? []) {
        if (block.type === 'tool_result') toolResults += `\n${toolResultText(block.content)}`
        if (block.type !== 'tool_use' || !(block.name in counts)) continue
        counts[block.name] += 1
        if (counts[block.name] > limits[block.name]) {
          stop(`Limit crossed (${JSON.stringify(counts)}); run stopped.`)
        }
      }
    }

    function handleLine(line) {
      if (!line.trim()) return
      try {
        handleEvent(JSON.parse(line))
      } catch {
        // Not an event line; ignore.
      }
    }

    child.stdout.setEncoding('utf8')
    child.stdout.on('data', (chunk) => {
      buffer += chunk
      const lines = buffer.split('\n')
      buffer = lines.pop()
      lines.forEach(handleLine)
    })
    child.stderr.on('data', (chunk) => (stderr += chunk))
    child.on('error', (error) => stop(`Could not run claude: ${error.message}`))
    child.on('close', (code) => {
      clearTimeout(timer)
      if (settled) return
      handleLine(buffer)
      if (!final) return stop(`claude ended without a result (exit ${code}): ${stderr.slice(0, 500)}`)
      if (final.is_error) {
        return stop(`claude reported an error: ${final.subtype ?? ''} ${String(final.result ?? '').slice(0, 300)}`)
      }
      let payload = final.structured_output
      if (!payload) {
        try {
          payload = JSON.parse(String(final.result).replace(/^```(json)?|```$/gm, ''))
        } catch {
          return stop('Could not parse the JSON from claude.')
        }
      }
      settled = true
      resolve({ payload, cost: final.total_cost_usd ?? 0, counts, toolResults: toolResults.toLowerCase() })
    })
    child.stdin.end(prompt)
  })
}
