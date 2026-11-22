// Landing gallery: the ONE place to list photos and their credits. A photo
// from a real GradSnap photographer gets `credit` (only with their
// permission); anything else stays `credit: null` and shows "Example photo".
// Never invent a credit.
import { PLACEHOLDER_PHOTOS, type PlaceholderPhotoKey } from '@/lib/placeholder-photos'

export type GalleryCredit = { name: string; instagram: string | null }

export type GalleryPhoto = {
  src: string
  alt: string
  credit: GalleryCredit | null
}

// Wikimedia Commons stand-ins (lib/placeholder-photos.ts) until real
// photographers' work exists. TODO replace with real photo.
const GALLERY_KEYS: readonly PlaceholderPhotoKey[] = ['graduateDome', 'capsSunset', 'burrussTower']

export const GALLERY_PHOTOS: readonly GalleryPhoto[] = GALLERY_KEYS.map((key) => ({
  src: PLACEHOLDER_PHOTOS[key].src,
  alt: PLACEHOLDER_PHOTOS[key].alt,
  credit: null,
}))

export type GalleryCaption =
  | { kind: 'credit'; name: string; handle: string | null }
  | { kind: 'example' }

export function galleryCaption(photo: GalleryPhoto): GalleryCaption {
  if (!photo.credit || photo.credit.name.trim() === '') return { kind: 'example' }
  const handle = photo.credit.instagram?.trim().replace(/^@+/, '') || null
  return { kind: 'credit', name: photo.credit.name.trim(), handle }
}
