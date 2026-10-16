import type { PaymentMethod } from '@/types/database'

export type PaymentSetup = {
  method: PaymentMethod | null
  requiresDeposit: boolean | null
}

export type NextStep = { text: string; payLabel: string | null }

// One line for the photographer's public profile, or null if not set yet.
export function paymentSummary({ method, requiresDeposit }: PaymentSetup): string | null {
  if (!method) return null
  const name = method === 'stripe' ? 'Stripe' : 'Cash'
  return requiresDeposit
    ? `${name}, with a deposit to confirm the booking`
    : `${name}, no deposit`
}

// What the client should do right after booking. payLabel is the button text
// for the photographer's payment link, or null when there's nothing to click.
export function nextPaymentStep(
  { method, requiresDeposit }: PaymentSetup,
  hasPaymentLink: boolean
): NextStep {
  if (method === 'cash') {
    return requiresDeposit
      ? {
          text: 'The photographer will tell you how to pay the cash deposit that secures your session. You can arrange it in Messages once they confirm.',
          payLabel: null,
        }
      : {
          text: "No deposit needed. You'll pay the full amount in cash on the day of the session.",
          payLabel: null,
        }
  }
  if (method === 'stripe') {
    if (requiresDeposit) {
      return hasPaymentLink
        ? {
            text: "Pay the deposit through the photographer's Stripe link to secure your session.",
            payLabel: 'Pay deposit',
          }
        : {
            text: 'The photographer will send you a Stripe link to pay the deposit.',
            payLabel: null,
          }
    }
    return hasPaymentLink
      ? {
          text: "No deposit needed. You'll pay through the photographer's Stripe link; check their payment terms for when.",
          payLabel: 'Open payment link',
        }
      : {
          text: 'No deposit needed. The photographer will send you a Stripe payment link.',
          payLabel: null,
        }
  }
  return hasPaymentLink
    ? {
        text: "Complete the payment using the photographer's payment link.",
        payLabel: 'Complete payment',
      }
    : { text: 'The photographer will contact you about payment.', payLabel: null }
}
