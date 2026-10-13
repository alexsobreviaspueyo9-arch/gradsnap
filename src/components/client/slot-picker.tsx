import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { AvailabilitySlot } from '@/types/database'

export function slotTimeLabel(
  slot: Pick<AvailabilitySlot, 'start_time' | 'end_time'>
): string {
  return `${slot.start_time.slice(0, 5)} - ${slot.end_time.slice(0, 5)}`
}

// Times are chosen here and booked by one primary button in the parent, so a
// stray tap never commits a session. Selection shows a check and a ring, not
// colour alone.
export function SlotPicker({
  slots,
  selectedId,
  onSelect,
  disabled = false,
  label,
}: {
  slots: readonly Pick<AvailabilitySlot, 'id' | 'start_time' | 'end_time'>[]
  selectedId: string | null
  onSelect: (slotId: string) => void
  disabled?: boolean
  label: string
}) {
  return (
    <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-2">
      {slots.map((slot) => {
        const isSelected = slot.id === selectedId
        return (
          <button
            key={slot.id}
            type="button"
            role="radio"
            aria-checked={isSelected}
            disabled={disabled}
            onClick={() => onSelect(slot.id)}
            className={cn(
              'flex h-11 items-center gap-2 rounded-full px-4 text-sm font-medium tabular-nums transition-colors disabled:opacity-60',
              isSelected
                ? 'bg-accent text-accent-foreground shadow-[inset_0_0_0_2px_var(--primary)]'
                : 'bg-muted hover:bg-secondary'
            )}
          >
            {isSelected && <Check className="size-4" aria-hidden />}
            {slotTimeLabel(slot)}
          </button>
        )
      })}
    </div>
  )
}
