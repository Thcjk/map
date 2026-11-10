import type { LngLat } from '../lib/geo'
import { brouter } from './brouter'
import type { Leg, RoutingProvider } from './types'

/** Aktiver Routing-Dienst. Hier austauschen, um einen anderen Anbieter zu nutzen. */
export const provider: RoutingProvider = brouter

const MAX_CACHE = 300
const cache = new Map<string, Leg>()

const key = (from: LngLat, to: LngLat) =>
  `${provider.id}:${from[0].toFixed(6)},${from[1].toFixed(6)};${to[0].toFixed(6)},${to[1].toFixed(6)}`

/** Teilstück routen; gleiche Anfragen kommen aus dem Cache. */
export async function routeLeg(from: LngLat, to: LngLat, signal: AbortSignal): Promise<Leg> {
  const k = key(from, to)
  const hit = cache.get(k)
  if (hit) {
    // als zuletzt benutzt markieren
    cache.delete(k)
    cache.set(k, hit)
    return hit
  }
  const leg = await provider.routeLeg(from, to, signal)
  cache.set(k, leg)
  if (cache.size > MAX_CACHE) cache.delete(cache.keys().next().value!)
  return leg
}

/** Luftlinie als Ersatz, wenn das Routing nicht verfügbar ist. */
export function straightLeg(from: LngLat, to: LngLat): Leg {
  return {
    points: [
      [from[0], from[1], null],
      [to[0], to[1], null],
    ],
    ways: [{ from: 0, to: 1, surface: 'unknown', sac: null }],
    routed: false,
  }
}
