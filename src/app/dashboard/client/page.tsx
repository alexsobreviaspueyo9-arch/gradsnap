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

export default async function ClientDashboard() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', user.id)
    .single()

  const displayName = profile?.full_name ?? user.email ?? 'there'

  const { data: myBookings } = await supabase
    .from('bookings')
    .select('id, status, slot_id')
    .eq('client_id', user.id)
    .in('status', ['pending', 'confirmed'])

  const slotIds = [...new Set((myBookings ?? []).map((b) => b.slot_id))]

  const { data: mySlots } =
    slotIds.length > 0
      ? await supabase.from('availability_slots').select('id, date').in('id', slotIds)
      : { data: [] }

  const slotDateById = new Map((mySlots ?? []).map((s) => [s.id, s.date]))
  const today = todayISODate()

  const upcomingCount = (myBookings ?? []).filter((b) => {
    const date = slotDateById.get(b.slot_id)
    return date && date >= today
  }).length

  const pastCount = (myBookings ?? []).filter((b) => {
    const date = slotDateById.get(b.slot_id)
    return date && date < today
  }).length

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
          <Badge variant="secondary">Client</Badge>
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
            Your client dashboard.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {[
            { label: 'Upcoming sessions', value: String(upcomingCount), icon: '📅' },
            { label: 'Past bookings', value: String(pastCount), icon: '📋' },
          ].map((stat) => (
            <Card key={stat.label}>
              <CardHeader className="pb-2">
                <CardDescription>{stat.icon} {stat.label}</CardDescription>
                <CardTitle className="text-3xl">{stat.value}</CardTitle>
              </CardHeader>
            </Card>
          ))}
        </div>

        <Link href="/dashboard/client/photographers">
          <Card className="transition-colors hover:border-primary/50">
            <CardHeader>
              <CardTitle>Find a photographer</CardTitle>
              <CardDescription>
                Browse photographers and book an available slot.
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>

        <Card>
          <CardHeader>
            <CardTitle>Your account</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>
              <span className="font-medium">Email: </span>
              {user.email}
            </p>
            <p>
              <span className="font-medium">Name: </span>
              {profile?.full_name ?? '—'}
            </p>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
