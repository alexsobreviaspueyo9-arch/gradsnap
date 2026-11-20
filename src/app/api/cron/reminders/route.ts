import { timingSafeEqual } from 'node:crypto'
import { NextResponse, type NextRequest } from 'next/server'
import { sendDueReminders } from '@/lib/booking-emails'
import { createServiceClient } from '@/lib/supabase/service'

export const dynamic = 'force-dynamic'

// Vercel Cron calls this once a day (vercel.json) with
// "Authorization: Bearer <CRON_SECRET>". Reminders are idempotent
// (reminder_*_sent_at), so a retry or a manual call never double-sends.
function isAuthorized(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET
  const header = request.headers.get('authorization') ?? ''
  if (!secret) return false
  const expected = Buffer.from(`Bearer ${secret}`)
  const given = Buffer.from(header)
  return given.length === expected.length && timingSafeEqual(given, expected)
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  // Backstop for the on-read sweep: expire requests nobody looked at.
  const { data: expired } = await createServiceClient().rpc('expire_stale_bookings')
  const reminder48h = await sendDueReminders('reminder_48h')
  const reminderDay = await sendDueReminders('reminder_day')
  return NextResponse.json({ expired: expired ?? 0, reminder48h, reminderDay })
}
