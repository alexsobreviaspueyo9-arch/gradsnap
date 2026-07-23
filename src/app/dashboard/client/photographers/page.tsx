import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'

export default async function ClientPhotographersPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: photographers } = await supabase
    .from('photographer_profiles')
    .select('*')
    .eq('has_signed_contract', true)

  const photographerIds = (photographers ?? []).map((p) => p.id)

  const { data: photos } =
    photographerIds.length > 0
      ? await supabase
          .from('portfolio_photos')
          .select('photographer_id, image_url, sort_order')
          .in('photographer_id', photographerIds)
          .order('sort_order', { ascending: true })
      : { data: [] }

  const firstPhotoByPhotographer = new Map<string, string>()
  for (const photo of photos ?? []) {
    if (!firstPhotoByPhotographer.has(photo.photographer_id)) {
      firstPhotoByPhotographer.set(photo.photographer_id, photo.image_url)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="max-w-4xl mx-auto px-6 py-10">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Photographers</h1>
          <p className="text-muted-foreground mt-1">
            Browse photographers and view their availability.
          </p>
        </div>

        {!photographers || photographers.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No photographers available yet.
          </p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
            {photographers.map((photographer) => {
              const thumbnail = firstPhotoByPhotographer.get(photographer.id)
              return (
                <Link
                  key={photographer.id}
                  href={`/dashboard/client/photographers/${photographer.id}`}
                >
                  <Card className="h-full overflow-hidden transition-colors hover:border-primary/50">
                    {thumbnail ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={thumbnail}
                        alt={photographer.display_name ?? 'Photographer'}
                        className="aspect-square w-full object-cover"
                      />
                    ) : (
                      <div className="aspect-square w-full bg-muted" />
                    )}
                    <CardHeader>
                      <CardTitle>
                        {photographer.display_name ?? 'Photographer'}
                      </CardTitle>
                      <CardDescription>
                        {[
                          photographer.city,
                          photographer.base_price
                            ? `€${photographer.base_price}`
                            : null,
                        ]
                          .filter(Boolean)
                          .join(' · ') || 'No details yet'}
                      </CardDescription>
                    </CardHeader>
                  </Card>
                </Link>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}
