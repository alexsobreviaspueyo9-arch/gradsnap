import Image from 'next/image'
import { GALLERY_PHOTOS, galleryCaption, type GalleryPhoto } from '@/lib/gallery'

// Caption under the photo (never over it): the photographer's credit, or a
// visible "Example photo" label for placeholders. Credits live in lib/gallery.ts.
function Caption({ photo }: { photo: GalleryPhoto }) {
  const caption = galleryCaption(photo)
  if (caption.kind === 'example') {
    return (
      <span className="inline-flex rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
        Example photo
      </span>
    )
  }
  return (
    <span className="text-sm">
      <span className="font-medium">{caption.name}</span>
      {caption.handle && <span className="text-muted-foreground"> · @{caption.handle}</span>}
    </span>
  )
}

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
        {GALLERY_PHOTOS.map((photo) => (
          <figure key={photo.src} className="w-[304px] shrink-0 snap-start md:w-[368px]">
            <div className="relative aspect-[4/5] overflow-hidden rounded-3xl bg-muted">
              <Image
                src={photo.src}
                alt={photo.alt}
                fill
                sizes="(min-width: 768px) 368px, 304px"
                loading="lazy"
                className="object-cover"
              />
            </div>
            <figcaption className="mt-3 px-1">
              <Caption photo={photo} />
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  )
}
