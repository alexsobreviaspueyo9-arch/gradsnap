import { Skeleton, SKELETON_PANEL } from '@/components/dashboard/skeleton'

const PHOTO_TILES = 5

export default function PhotographerProfileLoading() {
  return (
    <div role="status" aria-label="Loading photographer profile">
      <Skeleton className="mb-6 h-5 w-40" />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:items-start">
        <div className="space-y-6">
          <section className={SKELETON_PANEL}>
            <div className="flex items-start gap-4">
              <Skeleton className="size-16 shrink-0 rounded-full" />
              <div className="flex-1 space-y-3">
                <Skeleton className="h-9 w-2/3" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            </div>
            <Skeleton className="mt-6 h-16 w-full" />
          </section>
          <section className="grid grid-cols-3 gap-3">
            {Array.from({ length: PHOTO_TILES }, (_, i) => (
              <Skeleton
                key={i}
                className={i === 0 ? 'col-span-2 row-span-2 aspect-square rounded-3xl' : 'aspect-square rounded-3xl'}
              />
            ))}
          </section>
        </div>
        <section className="space-y-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-[560px] w-full rounded-3xl" />
        </section>
      </div>
    </div>
  )
}
