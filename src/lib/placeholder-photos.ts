// Every stand-in photograph on the site, in one place: openly licensed
// Wikimedia Commons files (CC0, CC BY, CC BY-SA; licence checked on each file
// page), no named people. Landing and empty states only, never a
// photographer's portfolio or profile photo. Credited in the landing footer.
// Stored locally in public/placeholder-photos/ so the site never hotlinks Commons.

export type PlaceholderPhoto = {
  src: string
  alt: string
  width: number
  height: number
  author: string
  license: string
  page: string
}

export const PLACEHOLDER_PHOTOS = {
  // TODO replace with real photo
  burrussDrillfield: {
    src: '/placeholder-photos/burruss-drillfield.jpg',
    alt: 'Burruss Hall at Virginia Tech seen across the Drillfield lawn on a clear autumn day',
    width: 1920,
    height: 1440,
    author: 'Eric T Gunther',
    license: 'CC BY 3.0',
    page: 'https://commons.wikimedia.org/wiki/File:Virginia_Tech_Burruss_Hall_from_Drillfield.JPG',
  },
  // TODO replace with real photo
  capsSunset: {
    src: '/placeholder-photos/caps-sunset.jpg',
    alt: 'Graduates in silhouette on a hilltop throwing their caps into a sunset sky',
    width: 1920,
    height: 1277,
    author: 'Baim Hanif',
    license: 'CC0',
    page: 'https://commons.wikimedia.org/wiki/File:Malacca_graduates_(Unsplash).jpg',
  },
  // TODO replace with real photo
  graduateDome: {
    src: '/placeholder-photos/graduate-dome.jpg',
    alt: 'A graduate in a gown raising a fist as a cap flies overhead, a domed building behind',
    width: 1920,
    height: 2880,
    author: 'JodyHongFilms',
    license: 'CC0',
    page: 'https://commons.wikimedia.org/wiki/File:Enjoy_The_Moment_(Unsplash).jpg',
  },
  // TODO replace with real photo
  drillfieldLibrary: {
    src: '/placeholder-photos/drillfield-library.jpg',
    alt: 'Students walking along the Drillfield at Virginia Tech toward Newman Library',
    width: 1920,
    height: 1440,
    author: 'Eric T Gunther',
    license: 'CC BY 3.0',
    page: 'https://commons.wikimedia.org/wiki/File:Drillfield_Virginia_Tech_Towards_Newman_Library.JPG',
  },
  // TODO replace with real photo
  burrussTower: {
    src: '/placeholder-photos/burruss-tower.jpg',
    alt: 'The stone tower of Burruss Hall at Virginia Tech in black and white',
    width: 1920,
    height: 2880,
    author: 'Smash the Iron Cage',
    license: 'CC BY-SA 4.0',
    page: 'https://commons.wikimedia.org/wiki/File:Burruss_Hall-2.jpg',
  },
} as const satisfies Record<string, PlaceholderPhoto>

export type PlaceholderPhotoKey = keyof typeof PLACEHOLDER_PHOTOS
