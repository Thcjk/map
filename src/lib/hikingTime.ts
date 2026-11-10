import { cumulativeDistances, smoothElevations, type RoutePoint } from './geo'

/**
 * Wanderzeit nach der Faustregel der Schweizer Wanderwege für die Signalisation:
 * 4 km/h in der Ebene, plus ¼ Stunde pro 100 m Aufstieg und pro 200 m Abstieg.
 *
 * Die offizielle Formel (Polynom der Steigung, seit 2006) ist noch nicht umgesetzt,
 * weil ihre Koeffizienten noch nicht aus einer Primärquelle verifiziert sind (siehe ROADMAP).
 * Die Funktion arbeitet pro Segment, damit Etappen nach Gehzeit geschnitten werden können.
 */
export const FLAT_SPEED_KMH = 4
export const MIN_PER_100M_ASCENT = 15
export const MIN_PER_200M_DESCENT = 15

/** Zeit in Minuten für ein Teilstück. */
export function segmentMinutes(horizontalM: number, ascentM: number, descentM: number): number {
  return (
    (horizontalM / 1000 / FLAT_SPEED_KMH) * 60 +
    (ascentM / 100) * MIN_PER_100M_ASCENT +
    (descentM / 200) * MIN_PER_200M_DESCENT
  )
}

/** Kumulierte Gehzeit in Minuten für jeden Punkt der Route. */
export function cumulativeMinutes(points: RoutePoint[], cum = cumulativeDistances(points)): number[] {
  const ele = smoothElevations(points.map((p) => p[2]))
  const out = new Array<number>(points.length)
  out[0] = 0
  for (let i = 1; i < points.length; i++) {
    const dh = (ele[i] ?? 0) - (ele[i - 1] ?? 0)
    out[i] = out[i - 1] + segmentMinutes(cum[i] - cum[i - 1], Math.max(dh, 0), Math.max(-dh, 0))
  }
  return out
}

/**
 * «3 h 05 min» bzw. «45 min». Auf 5 Minuten gerundet, wie auf Wegweisern.
 * `compact` lässt bei Stunden das «min» weg («3 h 05»).
 */
export function formatDuration(minutes: number, compact = false): string {
  const rounded = Math.round(minutes / 5) * 5
  const h = Math.floor(rounded / 60)
  const m = rounded % 60
  if (h === 0) return `${m} min`
  return `${h} h ${String(m).padStart(2, '0')}${compact ? '' : ' min'}`
}
