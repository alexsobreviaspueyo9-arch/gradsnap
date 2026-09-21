import Image from 'next/image'

// Placeholder photography (Unsplash License, no attribution required).
// Swap for real photographer portfolio shots once there is enough content.
const PHOTOS = [
  {
    id: 'photo-1618355776464-8666794d2520',
    alt: 'Graduate in academic dress smiling',
    ratio: '4 / 5',
    height: 'h-[380px] md:h-[460px]',
  },
  {
    id: 'photo-1616701318247-e87eb43e79e3',
    alt: 'Smiling graduate in academic dress',
    ratio: '4 / 3',
    height: 'h-[300px] md:h-[340px]',
  },
  {
    id: 'photo-1603764377193-75b991876878',
    alt: 'Graduate in black academic gown',
    ratio: '3 / 4',
    height: 'h-[420px] md:h-[520px]',
  },
  {
    id: 'photo-1576997355598-a5a9def46291',
    alt: 'Graduate in a black mortarboard',
    ratio: '4 / 5',
    height: 'h-[340px] md:h-[400px]',
  },
  {
    id: 'photo-1623945352596-36d5d9f21f70',
    alt: 'Graduate holding a bouquet of flowers',
    ratio: '3 / 4',
    height: 'h-[400px] md:h-[480px]',
  },
] as const

export function GalleryStrip() {
  return (
    <section id="gallery" className="scroll-mt-20 py-24 md:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <h2 className="max-w-xl font-heading text-4xl font-bold tracking-[-0.03em] text-balance sm:text-5xl">
          Moments other students booked
        </h2>
        <p className="mt-4 max-w-md text-lg leading-relaxed text-muted-foreground">
          A small sample of what GradSnap photographers deliver.
        </p>
      </div>

      <div
        role="region"
        aria-label="Sample graduation photos"
        tabIndex={0}
        className="gs-scrollbar-none mt-14 flex snap-x snap-mandatory items-end gap-4 overflow-x-auto scroll-px-4 px-4 pb-2 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring sm:scroll-px-6 sm:px-6"
      >
        {PHOTOS.map((photo) => (
          <figure
            key={photo.id}
            style={{ aspectRatio: photo.ratio }}
            className={`group relative shrink-0 snap-start overflow-hidden rounded-3xl bg-muted shadow-[0_20px_50px_-24px_var(--shadow-tint)] ${photo.height}`}
          >
            <Image
              src={`https://images.unsplash.com/${photo.id}?q=80&w=900&auto=format&fit=crop`}
              alt={photo.alt}
              fill
              sizes="(min-width: 768px) 360px, 300px"
              loading="lazy"
              className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
            />
          </figure>
        ))}
      </div>
    </section>
  )
}
