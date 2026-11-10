/** Punkt einer Route: [lng, lat, Höhe in m oder null]. */
export type RoutePoint = [number, number, number | null]
export type LngLat = [number, number]

const R = 6371008.8

/** Distanz in Metern (Haversine). */
export function distance(a: LngLat | RoutePoint, b: LngLat | RoutePoint): number {
  const toRad = Math.PI / 180
  const dLat = (b[1] - a[1]) * toRad
  const dLng = (b[0] - a[0]) * toRad
  const s =
    Math.sin(dLat / 2) ** 2 + Math.cos(a[1] * toRad) * Math.cos(b[1] * toRad) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(s)))
}

/** Kumulierte Distanz in Metern für jeden Punkt (erster Wert 0). */
export function cumulativeDistances(points: (LngLat | RoutePoint)[]): number[] {
  const out = new Array<number>(points.length)
  let sum = 0
  for (let i = 0; i < points.length; i++) {
    if (i > 0) sum += distance(points[i - 1], points[i])
    out[i] = sum
  }
  return out
}

/** Index des Punktes, dessen kumulierte Distanz `d` am nächsten liegt (binäre Suche). */
export function indexAtDistance(cum: number[], d: number): number {
  let lo = 0
  let hi = cum.length - 1
  while (lo < hi) {
    const mid = (lo + hi) >> 1
    if (cum[mid] < d) lo = mid + 1
    else hi = mid
  }
  if (lo > 0 && Math.abs(cum[lo - 1] - d) < Math.abs(cum[lo] - d)) return lo - 1
  return lo
}

/** Begrenzungsrechteck [west, süd, ost, nord]. */
export function bbox(points: (LngLat | RoutePoint)[]): [number, number, number, number] {
  let w = Infinity
  let s = Infinity
  let e = -Infinity
  let n = -Infinity
  for (const p of points) {
    if (p[0] < w) w = p[0]
    if (p[0] > e) e = p[0]
    if (p[1] < s) s = p[1]
    if (p[1] > n) n = p[1]
  }
  return [w, s, e, n]
}

/**
 * Geglättete Höhen mit Hysterese: Eine Höhenänderung zählt erst, wenn sie den
 * Schwellwert übersteigt. So blähen Messrauschen und DEM-Treppen die Höhenmeter nicht auf.
 * Punkte ohne Höhe übernehmen den letzten bekannten Wert (am Anfang den ersten bekannten).
 */
export function smoothElevations(eles: (number | null)[], threshold = 5): (number | null)[] {
  let ref: number | null = eles.find((e) => e !== null) ?? null
  return eles.map((e) => {
    if (e !== null && ref !== null && Math.abs(e - ref) >= threshold) ref = e
    return ref
  })
}

/** Auf- und Abstieg in Metern, auf Basis von {@link smoothElevations}. */
export function elevationGainLoss(eles: (number | null)[], threshold = 5): { ascent: number; descent: number } {
  const smooth = smoothElevations(eles, threshold)
  let ascent = 0
  let descent = 0
  for (let i = 1; i < smooth.length; i++) {
    const d = (smooth[i] ?? 0) - (smooth[i - 1] ?? 0)
    if (d > 0) ascent += d
    else descent -= d
  }
  return { ascent, descent }
}
