import { indexAtDistance, smoothElevations, type LngLat } from '../lib/geo'
import type { Route } from '../routing/route'
import { locateOnLine } from '../trails/pois'

export interface NavState {
  /** Position entlang der Route (m) */
  along: number
  /** Abstand zur Route (m) */
  offRoute: number
  remainingDistance: number
  remainingAscent: number
  remainingMinutes: number
  isOff: boolean
}

/** Ab diesem Abstand (plus GPS-Ungenauigkeit) gilt man als von der Route abgekommen. */
export const OFF_ROUTE_M = 40

/** Kumulierter Aufstieg pro Punkt (geglättet), einmal pro Route berechnen. */
export function cumulativeAscent(route: Route): number[] {
  const ele = smoothElevations(route.points.map((p) => p[2]))
  const out = new Array<number>(ele.length).fill(0)
  for (let i = 1; i < ele.length; i++) out[i] = out[i - 1] + Math.max(0, (ele[i] ?? 0) - (ele[i - 1] ?? 0))
  return out
}

export function navigate(route: Route, ascentCum: number[], pos: LngLat, accuracy: number): NavState {
  const line = route.points as unknown as LngLat[]
  const { along, offRoute } = locateOnLine(line, route.cum, pos)
  const i = indexAtDistance(route.cum, along)
  const last = route.points.length - 1
  return {
    along,
    offRoute,
    remainingDistance: Math.max(0, route.distance - along),
    remainingAscent: Math.max(0, ascentCum[last] - ascentCum[i]),
    remainingMinutes: Math.max(0, route.duration - route.minutes[i]),
    isOff: offRoute > OFF_ROUTE_M + Math.min(accuracy, 30),
  }
}
