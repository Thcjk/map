const nf1 = new Intl.NumberFormat('de-CH', { maximumFractionDigits: 1, minimumFractionDigits: 1 })
const nf0 = new Intl.NumberFormat('de-CH', { maximumFractionDigits: 0 })

/** Meter als «12.3 km» (unter 10 km mit einer Nachkommastelle). */
export function formatKm(m: number): string {
  const km = m / 1000
  return `${km < 10 ? nf1.format(km) : nf0.format(km)} km`
}

/** Höhenmeter als «1’250 m». */
export function formatM(m: number): string {
  return `${nf0.format(Math.round(m))} m`
}
