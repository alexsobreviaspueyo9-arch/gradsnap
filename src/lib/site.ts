// Canonical public origin, used for metadata, robots and sitemap.
export const SITE_URL = (
  process.env.APP_URL ?? 'https://gradsnap.vercel.app'
).replace(/\/$/, '')

export const SITE_NAME = 'GradSnap'
export const SITE_TITLE = 'GradSnap — Book your graduation photographer'
export const SITE_DESCRIPTION =
  'Connect with professional photographers for your graduation session.'
