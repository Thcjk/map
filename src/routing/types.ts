import type { LngLat, RoutePoint } from '../lib/geo'
import type { SacGrade, SurfaceClass } from './wayInfo'

/** Abschnitt mit gleichen Wegeigenschaften. `from`/`to` sind Indizes in `points`. */
export interface WaySegment {
  from: number
  to: number
  surface: SurfaceClass
  sac: SacGrade | null
}

/** Teilstück zwischen zwei Wegpunkten. */
export interface Leg {
  points: RoutePoint[]
  ways: WaySegment[]
  /** false = Luftlinie, weil das Routing nicht verfügbar war. */
  routed: boolean
}

/**
 * Austauschbarer Routing-Dienst. Ein neuer Anbieter muss nur diese Schnittstelle
 * erfüllen und in `routing/index.ts` eingetragen werden.
 */
export interface RoutingProvider {
  id: string
  label: string
  routeLeg(from: LngLat, to: LngLat, signal: AbortSignal): Promise<Leg>
}
