import { listTotalPrice } from '@/lib/fees'

// "$80", or "$80 - $150" when the photographer set a higher "up to" price.
export function formatPriceRange(
  basePrice: number | null,
  priceMax: number | null
): string | null {
  if (basePrice == null && priceMax == null) return null
  if (basePrice != null && priceMax != null && priceMax > basePrice) {
    return `$${basePrice} - $${priceMax}`
  }
  return `$${basePrice ?? priceMax}`
}

// "$191.33" (checkout amounts are exact).
export function formatMoney(amount: number): string {
  return `$${amount.toFixed(2)}`
}

// Same as formatPriceRange but all-in (session + GradSnap service fee),
// rounded up to whole dollars. Used only when PAYMENTS_ENABLED=true.
export function formatAllInPriceRange(
  basePrice: number | null,
  priceMax: number | null
): string | null {
  return formatPriceRange(
    basePrice == null ? null : listTotalPrice(basePrice),
    priceMax == null ? null : listTotalPrice(priceMax)
  )
}
