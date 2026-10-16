import { redirect } from 'next/navigation'
import { CalendarX2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { isUpcomingSlot, todayISODate } from '@/lib/date'
import { PageHeader } from '@/components/dashboard/page-header'
import {
  CalendarSearch,
  type SlotWithPhotographer,
} from '@/components/client/CalendarSearch'

export default async function ClientPhotographersPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  // Keeps every photographer's weekly hours filled 12 weeks ahead.
  await supabase.rpc('refresh_weekly_slots')

  const { data: photographers } = await supabase
    .from('photographer_profiles')
    .select(
      'id, display_name, city, base_price, price_max, specialty, specialty_other, payment_method, requires_deposit, payment_terms, payment_link'
    )
    .eq('has_signed_contract', true)

  const photographerIds = (photographers ?? []).map((p) => p.id)

  const { data: slots } =
    photographerIds.length > 0
      ? await supabase
          .from('availability_slots')
          .select('*')
          .in('photographer_id', photographerIds)
          .eq('is_booked', false)
          .gte('date', todayISODate())
          .order('date', { ascending: true })
          .order('start_time', { ascending: true })
      : { data: [] }

  const photographerById = new Map((photographers ?? []).map((p) => [p.id, p]))

  const slotsWithPhotographer: SlotWithPhotographer[] = (slots ?? [])
    .filter((slot) => isUpcomingSlot(slot))
    .map((slot) => {
      const photographer = photographerById.get(slot.photographer_id)
      return photographer ? { ...slot, photographer } : null
    })
    .filter((s): s is SlotWithPhotographer => s !== null)

  return (
    <>
      <PageHeader
        title="Find a photographer"
        description="Pick a date to see which photographers are available."
      />

      {slotsWithPhotographer.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-3xl border border-dashed border-border px-6 py-20 text-center">
          <span className="flex size-14 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
            <CalendarX2 className="size-7" strokeWidth={1.75} />
          </span>
          <p className="text-xl font-semibold">No open slots yet</p>
          <p className="max-w-sm text-sm text-muted-foreground">
            Photographers have not opened any dates. Check back soon.
          </p>
        </div>
      ) : (
        <CalendarSearch
          initialSlots={slotsWithPhotographer}
          paymentsEnabled={process.env.PAYMENTS_ENABLED === 'true'}
        />
      )}
    </>
  )
}
