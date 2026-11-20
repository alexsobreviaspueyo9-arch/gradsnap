// Campus photo spots (Virginia Tech, Blacksburg VA). One place to edit.
// Coordinates are APPROXIMATE: rounded to 3 decimals (about 100 m) and not
// surveyed. TODO-verify every lat/lng on site before relying on it.
// `photo` stays null until we have a photo we are allowed to use.

export type CampusSpot = {
  id: string
  name: string
  description: string
  lat: number
  lng: number
  photo: { src: string; alt: string; credit: string } | null
}

export const CAMPUS_CENTER = { lat: 37.227, lng: -80.422, zoom: 15 } as const

export const CAMPUS_SPOTS: readonly CampusSpot[] = [
  {
    id: 'drillfield',
    name: 'The Drillfield',
    description: 'The big central lawn with Hokie Stone buildings all around.',
    lat: 37.227, // TODO-verify
    lng: -80.422, // TODO-verify
    photo: null,
  },
  {
    id: 'burruss-hall',
    name: 'Burruss Hall',
    description: 'The classic Hokie Stone facade at the head of the Drillfield.',
    lat: 37.229, // TODO-verify
    lng: -80.424, // TODO-verify
    photo: null,
  },
  {
    id: 'war-memorial',
    name: 'War Memorial Chapel and Pylons',
    description: 'The eight pylons overlooking the Drillfield.',
    lat: 37.226, // TODO-verify
    lng: -80.421, // TODO-verify
    photo: null,
  },
  {
    id: 'duck-pond',
    name: 'Duck Pond',
    description: 'Water, trees and a gazebo for softer, natural backdrops.',
    lat: 37.224, // TODO-verify
    lng: -80.430, // TODO-verify
    photo: null,
  },
  {
    id: 'moss-arts',
    name: 'Moss Arts Center',
    description: 'Modern glass and stone near downtown Blacksburg.',
    lat: 37.231, // TODO-verify
    lng: -80.418, // TODO-verify
    photo: null,
  },
  {
    id: 'hahn-garden',
    name: 'Hahn Horticulture Garden',
    description: 'Flower beds and paths, best in spring.',
    lat: 37.220, // TODO-verify
    lng: -80.429, // TODO-verify
    photo: null,
  },
]

const SPOT_ID_RE = /^[a-z0-9-]{1,40}$/
export const MAX_PHOTO_SPOTS = 12

export function spotById(id: string): CampusSpot | null {
  return CAMPUS_SPOTS.find((s) => s.id === id) ?? null
}

// Keeps only known spot ids, without duplicates, in config order.
export function cleanSpotIds(values: readonly string[]): string[] {
  const wanted = new Set(values.filter((v) => SPOT_ID_RE.test(v)))
  return CAMPUS_SPOTS.filter((s) => wanted.has(s.id))
    .map((s) => s.id)
    .slice(0, MAX_PHOTO_SPOTS)
}

export function shootsAt(photoSpots: readonly string[] | null | undefined, spotId: string | null): boolean {
  if (!spotId) return true
  return (photoSpots ?? []).includes(spotId)
}
