import Image from 'next/image'
import { GALLERY_PHOTOS, galleryCaption, type GalleryPhoto } from '@/lib/gallery'
import { Reveal } from '@/components/landing/reveal'
import { cn } from '@/lib/utils'

// Caption under the photo (never over it): the photographer's credit, or a quiet
// "Example photo" label for stand-ins. Credits live in lib/gallery.ts.
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

const SPANS = ['md:col-span-4', 'md:col-span-5', 'md:col-span-3'] as const

export function GalleryStrip() {
  return (
    <section id="gallery" className="scroll-mt-20 bg-[color:var(--paper)] py-24 md:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <Reveal className="max-w-xl">
          <h2 className="font-display text-4xl leading-[1.1] font-normal text-balance sm:text-5xl">The day itself</h2>
          <p className="mt-4 max-w-md text-lg leading-relaxed text-muted-foreground text-pretty">
            Example photos for now. Our photographers&apos; own work appears here as they join.
          </p>
        </Reveal>

        <div className="mt-12 grid gap-5 md:grid-cols-12 md:items-end">
          {GALLERY_PHOTOS.map((photo, i) => (
            <Reveal key={photo.src} delay={i * 0.08} className={cn('min-w-0', SPANS[i % SPANS.length])}>
              <figure className="group">
                <div className="gs-lift relative aspect-[4/5] overflow-hidden rounded-2xl border border-border bg-muted gs-elev-1">
                  <Image
                    src={photo.src}
                    alt={photo.alt}
                    fill
                    sizes="(min-width: 768px) 40vw, 100vw"
                    loading="lazy"
                    className="object-cover transition-transform duration-500 ease-out motion-safe:group-hover:scale-105"
                  />
                </div>
                <figcaption className="mt-3">
                  <Caption photo={photo} />
                </figcaption>
              </figure>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}
