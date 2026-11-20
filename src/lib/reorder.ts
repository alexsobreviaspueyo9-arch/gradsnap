// Moves one item to a new index (immutable). Used to reorder the portfolio;
// index 0 is the cover photo shown on cards.
export function moveItem<T>(items: readonly T[], from: number, to: number): T[] {
  if (from === to || from < 0 || from >= items.length) return [...items]
  const target = Math.max(0, Math.min(items.length - 1, to))
  const next = [...items]
  const [moved] = next.splice(from, 1)
  next.splice(target, 0, moved)
  return next
}

// The sort_order updates needed so the database matches the new order.
export function sortOrderChanges<T extends { id: string; sort_order: number }>(
  ordered: readonly T[]
): { id: string; sort_order: number }[] {
  return ordered.flatMap((item, index) =>
    item.sort_order === index ? [] : [{ id: item.id, sort_order: index }]
  )
}
