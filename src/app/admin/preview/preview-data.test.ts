import { describe, expect, it } from 'vitest'
import { bookings, openSlots, photographer, previewThread, searchSlots, slots, viewers } from './preview-data'

describe('previewThread', () => {
  const { conversations } = viewers.client

  it('opens the thread picked by ?booking=', () => {
    const { selected, messages } = previewThread(conversations, conversations[0].id)
    expect(selected?.counterpartName).toBe('Maya Chen')
    expect(messages.length).toBeGreaterThan(0)
    expect(messages.every((m) => m.booking_id === conversations[0].id)).toBe(true)
  })

  it('shows only the list when nothing or an unknown booking is picked', () => {
    expect(previewThread(conversations, undefined)).toEqual({ selected: null, messages: [] })
    expect(previewThread(conversations, 'not-a-booking')).toEqual({ selected: null, messages: [] })
  })
})

describe('preview sample data', () => {
  it('only offers open slots for booking', () => {
    expect(openSlots.every((s) => !s.is_booked)).toBe(true)
    expect(searchSlots).toHaveLength(openSlots.length)
  })

  it('attaches every booking to a booked slot of the sample photographer', () => {
    for (const booking of bookings) {
      const slot = slots.find((s) => s.id === booking.slot_id)
      expect(slot?.is_booked).toBe(true)
      expect(slot?.photographer_id).toBe(photographer.id)
    }
  })

  it('shows the chat from both sides of the same booking', () => {
    expect(viewers.photographer.conversations[0].id).toBe(viewers.client.conversations[0].id)
    expect(viewers.photographer.userId).not.toBe(viewers.client.userId)
  })
})
