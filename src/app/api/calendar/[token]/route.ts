import { NextResponse, type NextRequest } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { zonedDateTime } from '@/lib/date'
import { buildIcs } from '@/lib/ics'
import { SITE_URL } from '@/lib/site'

const TOKEN_RE = /^[0-9a-f]{64}$/

// Private photographer feed (Google Calendar "From URL"). The token is the
// only credential: unknown or replaced tokens get an empty 404, and nothing
// is logged with it.
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
): Promise<NextResponse> {
  const token = (await params).token.replace(/\.ics$/, '')
  if (!TOKEN_RE.test(token)) return new NextResponse('Not found', { status: 404 })

  const { data: feed } = await createServiceClient()
    .from('photographer_calendar_feeds')
    .select('photographer_id')
    .eq('token', token)
    .maybeSingle()
  if (!feed) return new NextResponse('Not found', { status: 404 })

  const { data: events, error } = await createServiceClient().rpc('calendar_feed_events', { p_token: token })
  if (error) {
    console.error('Calendar feed failed:', error.message)
    return new NextResponse('Unavailable', { status: 503 })
  }

  const ics = buildIcs(
    (events ?? []).map((e) => ({
      uid: `${e.booking_id}@gradsnap.app`,
      start: zonedDateTime(e.date, e.start_time),
      end: zonedDateTime(e.date, e.end_time),
      summary: `${e.status === 'pending' ? '[Request] ' : ''}GradSnap: ${e.client_name ?? 'Client'}`,
      description: e.package_name ? `Package: ${e.package_name}` : null,
      url: `${SITE_URL}/dashboard/photographer/bookings`,
    })),
    { name: 'GradSnap bookings' }
  )

  return new NextResponse(ics, {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Cache-Control': 'private, max-age=900',
      'X-Robots-Tag': 'noindex',
    },
  })
}
