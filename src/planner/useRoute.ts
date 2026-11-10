import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { LngLat } from '../lib/geo'
import { routeLeg, straightLeg } from '../routing'
import { buildRoute, routeFromPoints, type Route } from '../routing/route'
import type { Leg } from '../routing/types'
import type { Plan } from './plannerState'

const DEBOUNCE_MS = 400
const legKey = (a: LngLat, b: LngLat) => `${a[0]},${a[1]};${b[0]},${b[1]}`

export interface RouteStatus {
  route: Route | null
  /** Teilstücke, die noch berechnet werden. */
  pending: number
  /** Fehlermeldung, falls ein Teilstück nur als Luftlinie vorliegt. */
  error: string | null
  retry: () => void
}

/**
 * Berechnet die Route zu einer Planung. Nur fehlende Teilstücke werden angefragt
 * (nacheinander, nach kurzer Pause), damit der öffentliche Routing-Dienst geschont wird.
 */
export function useRoute(plan: Plan): RouteStatus {
  const legs = useRef(new Map<string, Leg>())
  const failed = useRef(new Set<string>())
  const [version, setVersion] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [retryToken, setRetryToken] = useState(0)

  const pairs = useMemo<[LngLat, LngLat][]>(() => {
    if (plan.kind !== 'waypoints') return []
    return plan.waypoints.slice(1).map((p, i) => [plan.waypoints[i], p])
  }, [plan])

  useEffect(() => {
    const missing = pairs.filter(([a, b]) => !legs.current.has(legKey(a, b)))
    if (!missing.length) return
    const ctrl = new AbortController()
    const timer = setTimeout(async () => {
      for (const [a, b] of missing) {
        const k = legKey(a, b)
        try {
          legs.current.set(k, await routeLeg(a, b, ctrl.signal))
          failed.current.delete(k)
        } catch (e) {
          if (ctrl.signal.aborted) return
          legs.current.set(k, straightLeg(a, b))
          failed.current.add(k)
          setError(
            navigator.onLine === false
              ? 'Keine Internetverbindung: Abschnitte werden als Luftlinie gezeigt.'
              : `Routing nicht möglich (${(e as Error).message}). Abschnitt als Luftlinie.`,
          )
        }
        setVersion((v) => v + 1)
      }
    }, DEBOUNCE_MS)
    return () => {
      clearTimeout(timer)
      ctrl.abort()
    }
  }, [pairs, retryToken])

  const retry = useCallback(() => {
    for (const k of failed.current) legs.current.delete(k)
    failed.current.clear()
    setError(null)
    setRetryToken((t) => t + 1)
  }, [])

  return useMemo(() => {
    if (plan.kind === 'track') {
      return { route: routeFromPoints(plan.points, plan.ways), pending: 0, error: null, retry }
    }
    if (pairs.length === 0) return { route: null, pending: 0, error: null, retry }
    let pending = 0
    const list = pairs.map(([a, b]) => {
      const leg = legs.current.get(legKey(a, b))
      if (leg) return leg
      pending++
      return straightLeg(a, b)
    })
    const anyFailed = pairs.some(([a, b]) => failed.current.has(legKey(a, b)))
    return { route: buildRoute(list), pending, error: anyFailed ? error : null, retry }
    // version löst die Neuberechnung aus, sobald ein Teilstück eingetroffen ist
    // (legs/failed sind Refs).
  }, [plan, pairs, version, error, retry])
}
