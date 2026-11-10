import { describe, expect, it } from 'vitest'
import type { RoutePoint } from '../lib/geo'
import { routeFromPoints } from '../routing/route'
import type { Poi } from '../trails/pois'
import { autoCuts, moveCut, sleepSuggestions, snapCutsToSleep, stagesOf } from './stages'

// 100 km gerade nach Norden, 1 Punkt pro km, ab km 50 bergauf (+20 m/km)
const points: RoutePoint[] = Array.from({ length: 101 }, (_, i) => [7, 46 + i * 0.008993, i < 50 ? 500 : 500 + (i - 50) * 20])
const route = routeFromPoints(points, [])

describe('Etappen', () => {
  it('teilt nach Distanz gleichmässig auf', () => {
    const cuts = autoCuts(route, 'distance', 25)
    expect(cuts).toEqual([25, 50, 75])
    const stages = stagesOf(route, cuts)
    expect(stages).toHaveLength(4)
    expect(stages[0].distance / 1000).toBeCloseTo(25, 0)
    expect(stages[3].ascent).toBeCloseTo(500, -1)
  })

  it('rundet nicht wegen Kleinstresten eine Etappe dazu', () => {
    expect(autoCuts(route, 'distance', 50.5)).toHaveLength(1)
  })

  it('teilt nach Höhenmetern', () => {
    const cuts = autoCuts(route, 'ascent', 500)
    expect(cuts).toHaveLength(1)
    expect(cuts[0]).toBeGreaterThan(70)
  })

  it('teilt nach Gehzeit', () => {
    const stages = stagesOf(route, autoCuts(route, 'time', 6))
    for (const s of stages) expect(s.minutes).toBeLessThanOrEqual(6 * 60 + 15)
  })

  it('verschiebt Etappenenden nur zwischen den Nachbarn', () => {
    expect(moveCut([25, 50, 75], 1, 90, 101)).toEqual([25, 74, 75])
    expect(moveCut([25, 50, 75], 0, 0, 101)).toEqual([1, 50, 75])
  })

  it('schlägt Übernachtungen vor und richtet Etappen daran aus', () => {
    const hut: Poi = { id: 'n/1', category: 'hut', name: 'Hütte', kind: 'alpine_hut', lng: 7, lat: 46, offRoute: 200, along: 27000 }
    const water: Poi = { ...hut, id: 'n/2', category: 'water', along: 25000 }
    expect(sleepSuggestions([hut, water], 25000)).toEqual([hut])
    expect(snapCutsToSleep(route, [25, 50, 75], [hut])[0]).toBe(27)
  })
})
