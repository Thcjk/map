// Kennzahlen pro Produkt für Dashboard und Sortierung. Reine Funktionen (getestet).

/** Höchster gemessener Preis in den letzten `days` Tagen (Bezug für «echten» Rabatt). */
export function recentHigh(history, days, now = Date.now()) {
  const since = now - days * 86_400_000
  const prices = (history ?? []).filter((h) => h.price != null && Date.parse(h.t) >= since).map((h) => h.price)
  return prices.length ? Math.max(...prices) : null
}

/**
 * Zusammenfassung für die Liste.
 * discount: Rabatt in % gegenüber dem höchsten gemessenen Preis der letzten 30 Tage
 *           (nicht gegenüber dem «Statt»-Preis des Shops, der oft aufgeblasen ist).
 */
export function summarize(item, p, now = Date.now()) {
  const price = p?.current?.price ?? null
  const lowest = p?.lowest?.price ?? null
  const high = recentHigh(p?.history, 30, now)
  const points = (p?.history ?? []).filter((h) => h.price != null).length
  const discount = price != null && high ? Math.round((1 - price / high) * 100) : 0
  const belowTarget = price != null && item.targetPrice != null && price <= item.targetPrice
  const atLowest = price != null && lowest != null && price <= lowest && points >= 3
  return {
    price,
    lowest,
    discount,
    toTarget: price != null && item.targetPrice != null ? price - item.targetPrice : null,
    available: p?.current?.available ?? null,
    belowTarget,
    atLowest,
    bargain: belowTarget || (atLowest && discount >= 5),
    status: p?.status ?? 'pending',
  }
}

export const SORTS = {
  discount: { label: 'Rabatt', fn: (a, b) => b.s.discount - a.s.discount || (a.s.toTarget ?? 1e9) - (b.s.toTarget ?? 1e9) },
  target: { label: 'Abstand zum Ziel', fn: (a, b) => (a.s.toTarget ?? 1e9) - (b.s.toTarget ?? 1e9) },
  name: { label: 'Name', fn: (a, b) => a.item.name.localeCompare(b.item.name, 'de') },
}
