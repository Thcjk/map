import { cumulativeDistances, elevationGainLoss, type RoutePoint } from '../lib/geo'
import { cumulativeMinutes } from '../lib/hikingTime'
import type { Leg, WaySegment } from './types'
import { SAC_ORDER, type SacGrade, type SurfaceClass } from './wayInfo'

/** Zusammengesetzte Route mit vorberechneten Kennzahlen. */
export interface Route {
  points: RoutePoint[]
  ways: WaySegment[]
  /** Kumulierte Distanz (m) pro Punkt. */
  cum: number[]
  /** Kumulierte Gehzeit (min) pro Punkt. */
  minutes: number[]
  distance: number
  ascent: number
  descent: number
  duration: number
  hasElevation: boolean
  /** Meter pro Belagsart. */
  surfaces: Partial<Record<SurfaceClass, number>>
  /** Meter pro SAC-Grad. */
  sac: Partial<Record<SacGrade, number>>
  sacMax: SacGrade | null
  /** Punktbereiche der Teilstücke; `routed: false` = Luftlinie. */
  legRanges: { from: number; to: number; routed: boolean }[]
}

export function buildRoute(legs: Leg[]): Route {
  const points: RoutePoint[] = []
  const ways: WaySegment[] = []
  const legRanges: Route['legRanges'] = []
  for (const leg of legs) {
    // Der erste Punkt eines Teilstücks ist der letzte des vorherigen.
    const offset = points.length === 0 ? 0 : points.length - 1
    points.push(...(points.length === 0 ? leg.points : leg.points.slice(1)))
    for (const w of leg.ways) ways.push({ ...w, from: w.from + offset, to: w.to + offset })
    legRanges.push({ from: offset, to: points.length - 1, routed: leg.routed })
  }
  return routeFromPoints(points, ways, legRanges)
}

export function routeFromPoints(
  points: RoutePoint[],
  ways: WaySegment[],
  legRanges: Route['legRanges'] = [{ from: 0, to: points.length - 1, routed: true }],
): Route {
  const cum = cumulativeDistances(points)
  const minutes = points.length ? cumulativeMinutes(points, cum) : []
  const { ascent, descent } = elevationGainLoss(points.map((p) => p[2]))
  const surfaces: Route['surfaces'] = {}
  const sac: Route['sac'] = {}
  for (const w of ways) {
    const d = cum[w.to] - cum[w.from]
    surfaces[w.surface] = (surfaces[w.surface] ?? 0) + d
    if (w.sac) sac[w.sac] = (sac[w.sac] ?? 0) + d
  }
  const sacMax = [...SAC_ORDER].reverse().find((g) => sac[g]) ?? null
  return {
    points,
    ways,
    cum,
    minutes,
    distance: cum[cum.length - 1] ?? 0,
    ascent,
    descent,
    duration: minutes[minutes.length - 1] ?? 0,
    hasElevation: points.some((p) => p[2] !== null),
    surfaces,
    sac,
    sacMax,
    legRanges,
  }
}
