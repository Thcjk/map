import { describe, expect, it } from 'vitest'
import { cumulativeMinutes, formatDuration, segmentMinutes } from './hikingTime'
import type { RoutePoint } from './geo'

describe('Wanderzeit', () => {
  it('4 km in der Ebene dauern 1 h', () => {
    expect(segmentMinutes(4000, 0, 0)).toBeCloseTo(60)
  })

  it('rechnet Auf- und Abstieg dazu', () => {
    // 6 km, 400 Hm hinauf, 200 Hm hinunter: 90 + 60 + 15 Minuten
    expect(segmentMinutes(6000, 400, 200)).toBeCloseTo(165)
  })

  it('kumuliert entlang der Route', () => {
    const pts: RoutePoint[] = [
      [7, 46, 1000],
      [7, 46.009, 1100], // ca. 1 km, +100 m
      [7, 46.018, 1000], // ca. 1 km, -100 m
    ]
    const t = cumulativeMinutes(pts)
    expect(t[0]).toBe(0)
    expect(t[1]).toBeCloseTo(15 + 15, 0)
    expect(t[2]).toBeCloseTo(30 + 15 + 7.5, 0)
  })

  it('formatiert wie auf Wegweisern', () => {
    expect(formatDuration(42)).toBe('40 min')
    expect(formatDuration(184)).toBe('3 h 05 min')
    expect(formatDuration(2720, true)).toBe('45 h 20')
  })
})
