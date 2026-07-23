import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card'
import { buttonVariants } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { cn } from '@/lib/utils'
import { todayISODate } from '@/lib/date'
import { BookingWidget } from '@/components/client/BookingWidget'

export default async function PhotographerDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ booked?: string }>
}) {
  const { id } = await params
  const { booked } = await searchParams
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: photographer } = await supabase
    .from('photographer_profiles')
    .select('*')
    .eq('id', id)
    .single()

  if (!photographer) redirect('/dashboard/client/photographers')

  const { data: photos } = await supabase
    .from('portfolio_photos')
    .select('*')
    .eq('photographer_id', id)
    .order('sort_order', { ascending: true })

  const { data: slots } = await supabase
    .from('availability_slots')
    .select('*')
    .eq('photographer_id', id)
    .eq('is_booked', false)
    .gte('date', todayISODate())
    .order('date', { ascending: true })
    .order('start_time', { ascending: true })

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="max-w-2xl mx-auto px-6 py-10 space-y-6">
        <Link
          href="/dashboard/client/photographers"
          className={cn(buttonVariants({ variant: 'outline' }))}
        >
          Back to photographers
        </Link>

        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">
              {photographer.display_name ?? 'Photographer'}
            </CardTitle>
            <CardDescription>
              {[
                photographer.city,
                photographer.base_price ? `€${photographer.base_price}` : null,
              ]
                .filter(Boolean)
                .join(' · ') || 'No details yet'}
            </CardDescription>
          </CardHeader>
          {photographer.bio && (
            <CardContent className="text-sm">{photographer.bio}</CardContent>
          )}
        </Card>

        {photos && photos.length > 0 && (
          <div className="grid grid-cols-3 gap-2">
            {photos.map((photo) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={photo.id}
                src={photo.image_url}
                alt={photo.caption ?? 'Portfolio photo'}
                className="aspect-square w-full rounded-lg object-cover"
              />
            ))}
          </div>
        )}

        <div>
          <h2 className="text-xl font-bold mb-3">Book a session</h2>
          {booked === '1' && (
            <Alert className="mb-4">
              <AlertDescription>
                Payment received — finalizing your booking. It&apos;ll appear
                in your bookings shortly.
              </AlertDescription>
            </Alert>
          )}
          <BookingWidget
            photographerId={id}
            photographerName={photographer.display_name ?? 'this photographer'}
            basePrice={photographer.base_price}
            paymentsEnabled={process.env.PAYMENTS_ENABLED === 'true'}
            initialSlots={slots ?? []}
          />
        </div>
      </main>
    </div>
  )
}
