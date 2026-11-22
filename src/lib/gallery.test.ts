import { describe, expect, it } from 'vitest'
import { GALLERY_PHOTOS, galleryCaption } from './gallery'

describe('galleryCaption', () => {
  it('labels photos without a real credit as examples', () => {
    expect(galleryCaption({ src: 'x', alt: 'x', credit: null })).toEqual({ kind: 'example' })
    expect(galleryCaption({ src: 'x', alt: 'x', credit: { name: '  ', instagram: '@a' } })).toEqual({
      kind: 'example',
    })
  })

  it('shows the photographer name and a clean Instagram handle', () => {
    expect(
      galleryCaption({ src: 'x', alt: 'x', credit: { name: ' Maya Chen ', instagram: '@@mayachen' } })
    ).toEqual({ kind: 'credit', name: 'Maya Chen', handle: 'mayachen' })
    expect(galleryCaption({ src: 'x', alt: 'x', credit: { name: 'Jo', instagram: null } })).toEqual({
      kind: 'credit',
      name: 'Jo',
      handle: null,
    })
  })

  it('has no invented credits in the shipped config', () => {
    // Library stand-ins only: every one must say "Example photo".
    expect(GALLERY_PHOTOS.length).toBeGreaterThan(0)
    expect(GALLERY_PHOTOS.every((p) => p.credit === null)).toBe(true)
  })
})
