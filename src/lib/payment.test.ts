import { describe, expect, it } from 'vitest'
import { nextPaymentStep, paymentSummary } from './payment'

describe('paymentSummary', () => {
  it('describes each method and deposit combination', () => {
    expect(paymentSummary({ method: 'stripe', requiresDeposit: true })).toBe(
      'Stripe, with a deposit to confirm the booking'
    )
    expect(paymentSummary({ method: 'stripe', requiresDeposit: false })).toBe('Stripe, no deposit')
    expect(paymentSummary({ method: 'cash', requiresDeposit: true })).toBe(
      'Cash, with a deposit to confirm the booking'
    )
    expect(paymentSummary({ method: 'cash', requiresDeposit: false })).toBe('Cash, no deposit')
  })

  it('returns null until a method is chosen', () => {
    expect(paymentSummary({ method: null, requiresDeposit: null })).toBeNull()
  })
})

describe('nextPaymentStep', () => {
  it('offers the deposit link for Stripe with a deposit', () => {
    expect(nextPaymentStep({ method: 'stripe', requiresDeposit: true }, true).payLabel).toBe('Pay deposit')
  })

  it('has nothing to click for Stripe without a link', () => {
    expect(nextPaymentStep({ method: 'stripe', requiresDeposit: true }, false).payLabel).toBeNull()
  })

  it('never shows a payment button for cash, even if a link exists', () => {
    expect(nextPaymentStep({ method: 'cash', requiresDeposit: false }, true).payLabel).toBeNull()
    expect(nextPaymentStep({ method: 'cash', requiresDeposit: true }, true).payLabel).toBeNull()
  })

  it('falls back to the payment link when nothing is set', () => {
    expect(nextPaymentStep({ method: null, requiresDeposit: null }, true).payLabel).toBe('Complete payment')
  })
})
