// Landing gallery: the ONE place to list photos and their credits. A photo
// from a real GradSnap photographer gets `credit` (only with their
// permission); anything else stays `credit: null` and shows "Example photo".
// Never invent a credit.
export type GalleryCredit = { name: string; instagram: string | null }

export type GalleryPhoto = {
  src: string
  alt: string
  credit: GalleryCredit | null
}

const unsplash = (id: string): string =>
  `https://images.unsplash.com/${id}?q=80&w=900&auto=format&fit=crop`

// Unsplash License placeholders until real portfolio shots are added.
export const GALLERY_PHOTOS: readonly GalleryPhoto[] = [
  { src: unsplash('photo-1618355776464-8666794d2520'), alt: 'Graduate in academic dress smiling', credit: null },
  { src: unsplash('photo-1616701318247-e87eb43e79e3'), alt: 'Smiling graduate in academic dress', credit: null },
  { src: unsplash('photo-1603764377193-75b991876878'), alt: 'Graduate in black academic gown', credit: null },
  { src: unsplash('photo-1576997355598-a5a9def46291'), alt: 'Graduate in a black mortarboard', credit: null },
  { src: unsplash('photo-1623945352596-36d5d9f21f70'), alt: 'Graduate holding a bouquet of flowers', credit: null },
]

export type GalleryCaption =
  | { kind: 'credit'; name: string; handle: string | null }
  | { kind: 'example' }

export function galleryCaption(photo: GalleryPhoto): GalleryCaption {
  if (!photo.credit || photo.credit.name.trim() === '') return { kind: 'example' }
  const handle = photo.credit.instagram?.trim().replace(/^@+/, '') || null
  return { kind: 'credit', name: photo.credit.name.trim(), handle }
}
