// Starting point for a photographer's own cancellation terms (they edit it;
// GradSnap doesn't enforce it during the free pilot). Shown to clients as
// part of payment_terms, labelled "Set by the photographer".
export const SUGGESTED_CANCELLATION_POLICY = [
  'Cancellation policy:',
  '- Cancel 14 or more days before the session: full refund.',
  '- Cancel 3 to 13 days before: I keep 50% of the price.',
  '- Cancel less than 72 hours before: no refund.',
  '- If I have to cancel: you get a full refund.',
].join('\n')

// Adds the policy below existing payment terms instead of wiping them.
export function withSuggestedPolicy(current: string): string {
  const text = current.trim()
  if (text.includes(SUGGESTED_CANCELLATION_POLICY)) return text
  return text === '' ? SUGGESTED_CANCELLATION_POLICY : `${text}\n\n${SUGGESTED_CANCELLATION_POLICY}`
}
