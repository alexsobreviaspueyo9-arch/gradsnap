import { describe, expect, it } from 'vitest'
import { buildConversations, formatMessageTime, type ChatConversation } from './chat'

function conversation(overrides: Partial<ChatConversation>): ChatConversation {
  return {
    id: 'c1',
    created_at: '2026-10-01T10:00:00Z',
    counterpartName: 'Sam',
    ...overrides,
  }
}

describe('buildConversations', () => {
  it('attaches the newest message of each conversation', () => {
    const [result] = buildConversations(
      [conversation({})],
      [
        { conversation_id: 'c1', body: 'first', created_at: '2026-10-02T10:00:00Z', sender_id: 'u1' },
        { conversation_id: 'c1', body: 'latest', created_at: '2026-10-03T10:00:00Z', sender_id: 'u2' },
      ]
    )
    expect(result.lastMessage?.body).toBe('latest')
    expect(result.canWrite).toBe(true)
  })

  it('sorts by latest activity, falling back to when the conversation started', () => {
    const result = buildConversations(
      [
        conversation({ id: 'old-quiet', created_at: '2026-09-01T10:00:00Z' }),
        conversation({ id: 'new-quiet', created_at: '2026-10-05T10:00:00Z' }),
        conversation({ id: 'active', created_at: '2026-08-01T10:00:00Z' }),
      ],
      [{ conversation_id: 'active', body: 'hey', created_at: '2026-10-06T10:00:00Z', sender_id: 'u1' }]
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
