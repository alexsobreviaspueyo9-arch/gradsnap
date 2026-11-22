import Image from 'next/image'
import { GALLERY_PHOTOS, galleryCaption, type GalleryPhoto } from '@/lib/gallery'
import { cn } from '@/lib/utils'

// Caption under the photo (never over it): the photographer's credit, or a
// quiet "Example photo" label for stand-ins. Credits live in lib/gallery.ts.
function Caption({ photo }: { photo: GalleryPhoto }) {
  const caption = galleryCaption(photo)
  if (caption.kind === 'example') {
    return <span className="text-sm text-muted-foreground">Example photo</span>
  }
  return (
    <span className="text-sm">
      <span className="font-medium">{caption.name}</span>
      {caption.handle && <span className="text-muted-foreground"> @{caption.handle}</span>}
    </span>
  )
}

// Different widths, bottoms aligned, so the row reads as a spread rather than
// three equal cards.
const SPANS = ['md:col-span-4', 'md:col-span-5', 'md:col-span-3'] as const

export function GalleryStrip() {
  return (
    <section id="gallery" className="scroll-mt-20 bg-[var(--paper)] py-24 md:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="max-w-xl">
          <h2 className="font-display text-4xl leading-[1.1] font-normal sm:text-5xl">The day itself</h2>
          <p className="mt-4 max-w-md text-lg leading-relaxed text-muted-foreground">
            Example photos for now. Our photographers&apos; own work appears here as they join.
          </p>
        </div>

        <div className="mt-12 grid gap-4 md:grid-cols-12 md:items-end">
          {GALLERY_PHOTOS.map((photo, i) => (
            <figure key={photo.src} className={cn('min-w-0', SPANS[i % SPANS.length])}>
              <div className="relative aspect-[4/5] overflow-hidden rounded-2xl bg-muted">
                <Image
                  src={photo.src}
                  alt={photo.alt}
                  fill
                  sizes="(min-width: 768px) 40vw, 100vw"
                  loading="lazy"
                  className="object-cover"
                />
              </div>
              <figcaption className="mt-3">
                <Caption photo={photo} />
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  )
}
