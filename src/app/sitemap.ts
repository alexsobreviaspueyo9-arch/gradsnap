import type { MetadataRoute } from 'next'
import { createClient } from '@supabase/supabase-js'
import { CANCELLATION_POLICY_PATH, FEES_PATH, SITE_URL } from '@/lib/site'
import { PUBLIC_PHOTOGRAPHERS_PATH } from '@/lib/guest-booking'
import type { Database } from '@/types/database'

// Built per request, never at build time (the build must not query Supabase).
export const dynamic = 'force-dynamic'

// Listed photographers only (claimed + contracted, capped by the RPC), read
// with the anon key exactly like a guest.
async function photographerUrls(): Promise<MetadataRoute.Sitemap> {
  const supabase = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  )
  const { data, error } = await supabase.rpc('public_photographers')
  if (error) {
    console.error('Sitemap photographers failed:', error)
    return []
  }
  return (data ?? []).map((p) => ({
    url: `${SITE_URL}${PUBLIC_PHOTOGRAPHERS_PATH}/${p.id}`,
    changeFrequency: 'weekly',
    priority: 0.7,
  }))
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  return [
    { url: `${SITE_URL}/`, changeFrequency: 'weekly', priority: 1 },
    { url: `${SITE_URL}${PUBLIC_PHOTOGRAPHERS_PATH}`, changeFrequency: 'daily', priority: 0.9 },
    { url: `${SITE_URL}/register`, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${SITE_URL}/login`, changeFrequency: 'yearly', priority: 0.3 },
    ...(process.env.PAYMENTS_ENABLED === 'true'
      ? ([
          { url: `${SITE_URL}${FEES_PATH}`, changeFrequency: 'monthly', priority: 0.5 },
          { url: `${SITE_URL}${CANCELLATION_POLICY_PATH}`, changeFrequency: 'monthly', priority: 0.5 },
        ] satisfies MetadataRoute.Sitemap)
      : []),
    ...(await photographerUrls()),
  ]
}
