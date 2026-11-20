// The booking widget's steps: package (only when the photographer offers
// packages), time, review. One primary action per step.
export type BookingStep = 'package' | 'time' | 'review'

export function bookingSteps(hasPackages: boolean): BookingStep[] {
  return hasPackages ? ['package', 'time', 'review'] : ['time', 'review']
}

export function canContinue(
  step: BookingStep,
  selection: { packageId: string | null; slotId: string | null }
): boolean {
  if (step === 'package') return selection.packageId !== null
  if (step === 'time') return selection.slotId !== null
  return selection.slotId !== null
}

// Where to start: the first step that still needs a choice.
export function firstOpenStep(
  steps: BookingStep[],
  selection: { packageId: string | null; slotId: string | null }
): BookingStep {
  return steps.find((step) => step !== 'review' && !canContinue(step, selection)) ?? 'review'
}

export const REVIEW_MAX_LENGTH = 1000

export function reviewError(rating: number | null, body: string): string | null {
  if (rating == null || !Number.isInteger(rating) || rating < 1 || rating > 5) {
    return 'Choose a rating from 1 to 5.'
  }
  if (body.trim().length > REVIEW_MAX_LENGTH) return `Keep the review under ${REVIEW_MAX_LENGTH} characters.`
  return null
}
