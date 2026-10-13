import Image from 'next/image'

// Placeholder photography (Unsplash License, no attribution required).
// Swap for real photographer portfolio shots once there is enough content.
const PHOTOS = [
  {
    id: 'photo-1618355776464-8666794d2520',
    alt: 'Graduate in academic dress smiling',
  },
  {
    id: 'photo-1616701318247-e87eb43e79e3',
    alt: 'Smiling graduate in academic dress',
  },
  {
    id: 'photo-1603764377193-75b991876878',
    alt: 'Graduate in black academic gown',
  },
  {
    id: 'photo-1576997355598-a5a9def46291',
    alt: 'Graduate in a black mortarboard',
  },
  {
    id: 'photo-1623945352596-36d5d9f21f70',
    alt: 'Graduate holding a bouquet of flowers',
  },
] as const

export function GalleryStrip() {
  return (
    <section id="gallery" className="scroll-mt-24 pb-24 md:pb-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <h2 className="max-w-xl text-4xl font-semibold tracking-[-0.03em] text-balance sm:text-5xl">
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
        className="gs-scrollbar-none gs-bleed-x mt-12 flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2"
      >
        {PHOTOS.map((photo) => (
          <figure
            key={photo.id}
            className="relative aspect-[4/5] h-[380px] shrink-0 snap-start overflow-hidden rounded-3xl bg-muted md:h-[460px]"
          >
            <Image
              src={`https://images.unsplash.com/${photo.id}?q=80&w=900&auto=format&fit=crop`}
              alt={photo.alt}
              fill
              sizes="(min-width: 768px) 368px, 304px"
              loading="lazy"
              className="object-cover"
            />
          </figure>
        ))}
      </div>
    </section>
  )
}
