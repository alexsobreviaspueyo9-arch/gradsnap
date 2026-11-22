import { cn } from '@/lib/utils'

// Fall 2026 pilot: GradSnap charges nothing; clients pay photographers
// directly. Render only while PAYMENTS_ENABLED is not 'true'.
export const PILOT_NOTE = 'Free during our launch pilot. You pay your photographer directly.'

export function PilotNote({ className }: { className?: string }) {
  return (
    <p
      className={cn(
        'text-sm text-muted-foreground',
        className
      )}
    >
      {PILOT_NOTE}
    </p>
  )
}
