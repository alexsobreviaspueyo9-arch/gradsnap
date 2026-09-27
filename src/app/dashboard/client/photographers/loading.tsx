import { Skeleton, SKELETON_PANEL } from '@/components/dashboard/skeleton'

const CARD_COUNT = 3

export default function PhotographersLoading() {
  return (
    <div role="status" aria-label="Loading photographers">
      <div className="mb-8 space-y-3">
        <Skeleton className="h-10 w-72" />
        <Skeleton className="h-5 w-96 max-w-full" />
      </div>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:items-start">
        <div className="space-y-4">
          <Skeleton className="h-24 w-full rounded-3xl" />
          <Skeleton className="h-[560px] w-full rounded-3xl" />
        </div>
        <div className="space-y-3">
          <Skeleton className="h-8 w-56" />
          {Array.from({ length: CARD_COUNT }, (_, i) => (
            <div key={i} className={SKELETON_PANEL}>
              <div className="flex items-start gap-3">
                <Skeleton className="size-11 shrink-0 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-5 w-1/2" />
                  <Skeleton className="h-4 w-2/3" />
                </div>
              </div>
              <div className="mt-4 flex gap-2">
                <Skeleton className="h-9 w-28 rounded-full" />
                <Skeleton className="h-9 w-28 rounded-full" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
