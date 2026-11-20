import { describe, expect, it } from 'vitest'
import { moveItem, sortOrderChanges } from './reorder'

describe('moveItem', () => {
  it('moves an item forward and back without mutating the input', () => {
    const items = ['a', 'b', 'c', 'd']
    expect(moveItem(items, 3, 0)).toEqual(['d', 'a', 'b', 'c'])
    expect(moveItem(items, 0, 2)).toEqual(['b', 'c', 'a', 'd'])
    expect(items).toEqual(['a', 'b', 'c', 'd'])
  })

  it('clamps the target and ignores bad indexes', () => {
    expect(moveItem(['a', 'b'], 0, 9)).toEqual(['b', 'a'])
    expect(moveItem(['a', 'b'], 5, 0)).toEqual(['a', 'b'])
  })
})

describe('sortOrderChanges', () => {
  it('lists only rows whose position changed', () => {
    expect(
      sortOrderChanges([
        { id: 'c', sort_order: 2 },
        { id: 'a', sort_order: 0 },
        { id: 'b', sort_order: 1 },
      ])
    ).toEqual([
      { id: 'c', sort_order: 0 },
      { id: 'a', sort_order: 1 },
      { id: 'b', sort_order: 2 },
    ])
    expect(sortOrderChanges([{ id: 'a', sort_order: 0 }])).toEqual([])
  })
})
