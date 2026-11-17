// GradSnap money rules (dormant until PAYMENTS_ENABLED=true). Pure and
// string-free: amounts are US dollars rounded to cents, computed in cents.

export const CLIENT_FEE_RATE = 0.06
export const CLIENT_FEE_MINIMUM = 6
// Commission on the session price, by where the client came from.
export const COMMISSION_RATE = { gradsnap: 0.15, own: 0 } as const
export type ClientSource = keyof typeof COMMISSION_RATE
// 50% of the session price + the whole fee at booking; the other 50% is
// charged automatically before the session; the photographer is paid after.
export const DEPOSIT_RATE = 0.5
export const BALANCE_CHARGE_HOURS_BEFORE = 72
export const PAYOUT_HOURS_AFTER = 48

const HOUR_MS = 3_600_000

const toCents = (dollars: number): number => Math.round(dollars * 100)
const toDollars = (cents: number): number => cents / 100

function assertPrice(sessionPrice: number): void {
  if (!Number.isFinite(sessionPrice) || sessionPrice < 0) {
    throw new RangeError(`Invalid session price: ${sessionPrice}`)
  }
}

export function clientFee(sessionPrice: number): number {
  assertPrice(sessionPrice)
  const percent = Math.round(toCents(sessionPrice) * CLIENT_FEE_RATE)
  return toDollars(Math.max(percent, toCents(CLIENT_FEE_MINIMUM)))
}

// What the client pays in total (exact, for checkout).
export function totalPrice(sessionPrice: number): number {
  return toDollars(toCents(sessionPrice) + toCents(clientFee(sessionPrice)))
}

// All-in price for lists and cards: rounded up to whole dollars, never below
// the exact total.
export function listTotalPrice(sessionPrice: number): number {
  return Math.ceil(totalPrice(sessionPrice))
}

export type FeeBreakdown = {
  sessionPrice: number
  clientFee: number
  total: number
  deposit: number
  dueAtBooking: number
  balance: number
  commission: number
  photographerPayout: number
}

export function feeBreakdown(sessionPrice: number, source: ClientSource = 'gradsnap'): FeeBreakdown {
  assertPrice(sessionPrice)
  const price = toCents(sessionPrice)
  const fee = toCents(clientFee(sessionPrice))
  const deposit = Math.round(price * DEPOSIT_RATE)
  const commission = Math.round(price * COMMISSION_RATE[source])
  return {
    sessionPrice: toDollars(price),
    clientFee: toDollars(fee),
    total: toDollars(price + fee),
    deposit: toDollars(deposit),
    dueAtBooking: toDollars(deposit + fee),
    balance: toDollars(price - deposit),
    commission: toDollars(commission),
    photographerPayout: toDollars(price - commission),
  }
}

// When the balance is charged (never before the booking itself) and when the
// photographer is paid.
export function paymentSchedule(
  sessionStart: Date,
  bookedAt: Date = new Date()
): { balanceChargeAt: Date; payoutAt: Date } {
  const balanceChargeAt = new Date(
    Math.max(sessionStart.getTime() - BALANCE_CHARGE_HOURS_BEFORE * HOUR_MS, bookedAt.getTime())
  )
  return {
    balanceChargeAt,
    payoutAt: new Date(sessionStart.getTime() + PAYOUT_HOURS_AFTER * HOUR_MS),
  }
}
