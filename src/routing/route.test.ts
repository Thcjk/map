import { describe, expect, it } from 'vitest'
import { buildRoute } from './route'
import type { Leg } from './types'

const leg = (lngs: number[], ele: number[], sac: 'T2' | null = null): Leg => ({
  points: lngs.map((lng, i) => [lng, 46, ele[i]]),
  ways: [{ from: 0, to: lngs.length - 1, surface: 'path', sac }],
  routed: true,
})

describe('buildRoute', () => {
  it('fügt Teilstücke ohne doppelte Punkte zusammen', () => {
    const r = buildRoute([leg([7, 7.01], [1000, 1100]), leg([7.01, 7.02], [1100, 1050], 'T2')])
    expect(r.points).toHaveLength(3)
    expect(r.ways[1]).toMatchObject({ from: 1, to: 2, sac: 'T2' })
    expect(r.distance / 1000).toBeCloseTo(1.546, 2)
    expect(r.ascent).toBe(100)
    expect(r.descent).toBe(50)
    expect(r.sacMax).toBe('T2')
    expect(r.surfaces.path).toBeCloseTo(r.distance)
  })
})
