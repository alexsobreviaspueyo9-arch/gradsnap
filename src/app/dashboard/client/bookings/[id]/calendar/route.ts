import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { isUuid } from '@/lib/guest-booking'
import { zonedDateTime } from '@/lib/date'
import { buildIcs } from '@/lib/ics'
import { SITE_URL } from '@/lib/site'

// "Add to calendar": one .ics event for the signed-in client's own booking.
// RLS returns nothing for anyone else's booking, so that's a 404.
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const { id } = await params
  if (!isUuid(id)) return new NextResponse('Not found', { status: 404 })

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return new NextResponse('Not found', { status: 404 })

  const { data: booking } = await supabase
    .from('bookings')
    .select('id, slot_id, status, package_name')
    .eq('id', id)
    .eq('client_id', user.id)
    .maybeSingle()
  if (!booking || booking.status === 'cancelled') return new NextResponse('Not found', { status: 404 })

  const { data: slot } = await supabase
    .from('availability_slots')
    .select('date, start_time, end_time, photographer_id')
    .eq('id', booking.slot_id)
    .maybeSingle()
  if (!slot) return new NextResponse('Not found', { status: 404 })

  const { data: photographer } = await supabase
    .from('photographer_profiles')
    .select('display_name')
    .eq('id', slot.photographer_id)
    .maybeSingle()

  const name = photographer?.display_name ?? 'your photographer'
  const ics = buildIcs([
    {
      uid: `${booking.id}@gradsnap.app`,
      start: zonedDateTime(slot.date, slot.start_time),
      end: zonedDateTime(slot.date, slot.end_time),
      summary: `Graduation photos with ${name}`,
      description: booking.package_name ? `Package: ${booking.package_name}` : null,
      url: `${SITE_URL}/dashboard/client/bookings`,
    },
  ])

  return new NextResponse(ics, {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': 'attachment; filename="gradsnap-session.ics"',
      'Cache-Control': 'private, no-store',
    },
  })
}
