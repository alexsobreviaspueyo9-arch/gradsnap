import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { todayISODate } from '@/lib/date'

export default async function PhotographerDashboard() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  // Fetch photographer profile
  const { data: photographerProfile } = await supabase
    .from('photographer_profiles')
    .select('*')
    .eq('user_id', user.id)
    .single()

  // Redirect to contract if not signed yet
  if (photographerProfile && !photographerProfile.has_signed_contract) {
    redirect('/onboarding/photographer/contract')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', user.id)
    .single()

  const { count: photoCount } = photographerProfile
    ? await supabase
        .from('portfolio_photos')
        .select('id', { count: 'exact', head: true })
        .eq('photographer_id', photographerProfile.id)
    : { count: 0 }

  const { count: availableSlotCount } = photographerProfile
    ? await supabase
        .from('availability_slots')
        .select('id', { count: 'exact', head: true })
        .eq('photographer_id', photographerProfile.id)
        .eq('is_booked', false)
        .gte('date', todayISODate())
    : { count: 0 }

  let totalBookingCount = 0
  if (photographerProfile) {
    const { data: slotIdRows } = await supabase
      .from('availability_slots')
      .select('id')
      .eq('photographer_id', photographerProfile.id)

    const slotIds = (slotIdRows ?? []).map((s) => s.id)

    if (slotIds.length > 0) {
      const { count } = await supabase
        .from('bookings')
        .select('id', { count: 'exact', head: true })
        .in('slot_id', slotIds)
      totalBookingCount = count ?? 0
    }
  }

  const displayName =
    photographerProfile?.display_name ??
    profile?.full_name ??
    user.email ??
    'Photographer'

  async function signOut() {
    'use server'
    const supabase = await createClient()
    await supabase.auth.signOut()
    redirect('/login')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b bg-white px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-xl font-bold tracking-tight">GradSnap</span>
          <Badge variant="secondary">Photographer</Badge>
        </div>
        <form action={signOut}>
          <Button variant="outline" size="sm" type="submit">
            Sign out
          </Button>
        </form>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-10 space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Welcome, {displayName} 👋</h1>
          <p className="text-muted-foreground mt-1">
            Your photographer dashboard.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {[
            { label: 'Portfolio photos', value: String(photoCount ?? 0), icon: '🖼️' },
            { label: 'Available slots', value: String(availableSlotCount ?? 0), icon: '📅' },
            { label: 'Total bookings', value: String(totalBookingCount), icon: '📋' },
          ].map((stat) => (
            <Card key={stat.label}>
              <CardHeader className="pb-2">
                <CardDescription>{stat.icon} {stat.label}</CardDescription>
                <CardTitle className="text-3xl">{stat.value}</CardTitle>
              </CardHeader>
            </Card>
          ))}
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Link href="/dashboard/photographer/profile">
            <Card className="h-full transition-colors hover:border-primary/50">
              <CardHeader>
                <CardTitle>Edit profile</CardTitle>
                <CardDescription>
                  Update your display name, bio, city and base price.
                </CardDescription>
              </CardHeader>
            </Card>
          </Link>
          <Link href="/dashboard/photographer/portfolio">
            <Card className="h-full transition-colors hover:border-primary/50">
              <CardHeader>
                <CardTitle>Manage portfolio</CardTitle>
                <CardDescription>
                  Upload and organize the photos clients will see.
                </CardDescription>
              </CardHeader>
            </Card>
          </Link>
          <Link href="/dashboard/photographer/availability">
            <Card className="h-full transition-colors hover:border-primary/50">
              <CardHeader>
                <CardTitle>Manage availability</CardTitle>
                <CardDescription>
                  Add open time slots for clients to book.
                </CardDescription>
              </CardHeader>
            </Card>
          </Link>
          <Link href="/dashboard/photographer/bookings">
            <Card className="h-full transition-colors hover:border-primary/50">
              <CardHeader>
                <CardTitle>Bookings</CardTitle>
                <CardDescription>
                  Confirm or cancel pending booking requests.
                </CardDescription>
              </CardHeader>
            </Card>
          </Link>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Your profile</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>
              <span className="font-medium">Email: </span>
              {user.email}
            </p>
            <p>
              <span className="font-medium">Display name: </span>
              {photographerProfile?.display_name ?? '—'}
            </p>
            <p>
              <span className="font-medium">City: </span>
              {photographerProfile?.city ?? '—'}
            </p>
            <p>
              <span className="font-medium">Base price: </span>
              {photographerProfile?.base_price
                ? `€${photographerProfile.base_price}`
                : '—'}
            </p>
            <p>
              <span className="font-medium">Contract signed: </span>
              {photographerProfile?.has_signed_contract ? '✅ Yes' : '❌ No'}
            </p>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
