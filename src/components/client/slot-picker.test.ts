import { describe, expect, it } from 'vitest'
import { slotTimeLabel } from '@/components/client/slot-picker'

describe('slotTimeLabel', () => {
  it('shows hours and minutes without seconds', () => {
    expect(slotTimeLabel({ start_time: '10:00:00', end_time: '11:30:00' })).toBe('10:00 - 11:30')
  })

  it('accepts times that already come without seconds', () => {
    expect(slotTimeLabel({ start_time: '09:30', end_time: '10:30' })).toBe('09:30 - 10:30')
  })
})
