// "€80", or "€80 - €150" when the photographer set a higher "up to" price.
export function formatPriceRange(
  basePrice: number | null,
  priceMax: number | null
): string | null {
  if (basePrice == null && priceMax == null) return null
  if (basePrice != null && priceMax != null && priceMax > basePrice) {
    return `€${basePrice} - €${priceMax}`
  }
  return `€${basePrice ?? priceMax}`
}
