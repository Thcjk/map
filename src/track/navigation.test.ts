import { describe, expect, it } from 'vitest'
import type { RoutePoint } from '../lib/geo'
import { routeFromPoints } from '../routing/route'
import { cumulativeAscent, navigate } from './navigation'

// 10 km nach Norden, stetig 50 m/km bergauf
const points: RoutePoint[] = Array.from({ length: 11 }, (_, i) => [7, 46 + i * 0.008993, 1000 + i * 50])
const route = routeFromPoints(points, [])
const asc = cumulativeAscent(route)

describe('Navigation', () => {
  it('berechnet Rest-Distanz, -Höhenmeter und -Zeit', () => {
    const n = navigate(route, asc, [7, 46 + 4 * 0.008993], 10)
    expect(n.remainingDistance / 1000).toBeCloseTo(6, 1)
    expect(n.remainingAscent).toBeCloseTo(300, -1)
    expect(n.remainingMinutes).toBeCloseTo(route.duration * 0.6, 0)
    expect(n.isOff).toBe(false)
  })

  it('erkennt das Abweichen und toleriert GPS-Ungenauigkeit', () => {
    const near = navigate(route, asc, [7.0006, 46.02], 20) // ~46 m daneben
    expect(near.isOff).toBe(false)
    const far = navigate(route, asc, [7.002, 46.02], 10) // ~155 m daneben
    expect(far.isOff).toBe(true)
    expect(far.offRoute).toBeGreaterThan(140)
  })
})
