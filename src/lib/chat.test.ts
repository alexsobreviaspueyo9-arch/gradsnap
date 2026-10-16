import { describe, expect, it } from 'vitest'
import { buildConversations, canWriteToChat, formatMessageTime, type ChatBooking } from './chat'

function booking(overrides: Partial<ChatBooking>): ChatBooking {
  return {
    id: 'b1',
    status: 'confirmed',
    created_at: '2026-10-01T10:00:00Z',
    date: '2026-10-20',
    start_time: '17:00:00',
    counterpartName: 'Sam',
    ...overrides,
  }
}

describe('canWriteToChat', () => {
  it('allows writing only on confirmed or completed bookings', () => {
    expect(canWriteToChat('confirmed')).toBe(true)
    expect(canWriteToChat('completed')).toBe(true)
    expect(canWriteToChat('pending')).toBe(false)
    expect(canWriteToChat('cancelled')).toBe(false)
  })
})

describe('buildConversations', () => {
  it('attaches the newest message of each booking', () => {
    const [conversation] = buildConversations(
      [booking({})],
      [
        { booking_id: 'b1', body: 'first', created_at: '2026-10-02T10:00:00Z', sender_id: 'u1' },
        { booking_id: 'b1', body: 'latest', created_at: '2026-10-03T10:00:00Z', sender_id: 'u2' },
      ]
    )
    expect(conversation.lastMessage?.body).toBe('latest')
    expect(conversation.canWrite).toBe(true)
  })

  it('drops cancelled bookings nobody wrote in but keeps cancelled ones with history', () => {
    const result = buildConversations(
      [
        booking({ id: 'empty', status: 'cancelled' }),
        booking({ id: 'history', status: 'cancelled' }),
      ],
      [{ booking_id: 'history', body: 'hi', created_at: '2026-10-02T10:00:00Z', sender_id: 'u1' }]
    )
    expect(result.map((c) => c.id)).toEqual(['history'])
    expect(result[0].canWrite).toBe(false)
  })

  it('sorts by latest activity, falling back to when the booking was made', () => {
    const result = buildConversations(
      [
        booking({ id: 'old-quiet', created_at: '2026-09-01T10:00:00Z' }),
        booking({ id: 'new-quiet', created_at: '2026-10-05T10:00:00Z' }),
        booking({ id: 'active', created_at: '2026-08-01T10:00:00Z' }),
      ],
      [{ booking_id: 'active', body: 'hey', created_at: '2026-10-06T10:00:00Z', sender_id: 'u1' }]
    )
    expect(result.map((c) => c.id)).toEqual(['active', 'new-quiet', 'old-quiet'])
  })
})

describe('formatMessageTime', () => {
  it('formats in the America/New_York market zone', () => {
    // 16:30 UTC is 12:30 in New York during daylight saving time.
    expect(formatMessageTime('2026-10-06T16:30:00Z')).toBe('Oct 6, 12:30 PM')
  })
})
