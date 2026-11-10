import { describe, expect, it } from 'vitest'
import { buildActivity } from './activities'

describe('buildActivity', () => {
  it('berechnet Kennzahlen und Dauer aus Zeitstempeln', () => {
    const a = buildActivity(' Test ', 'gpx', [[7, 46, 1000], [7, 46.009, 1100], [7, 46.018, 1104]], [1000, null, 3_601_000], null)
    expect(a.name).toBe('Test')
    expect(a.distance / 1000).toBeCloseTo(2, 1)
    expect(a.ascent).toBe(100) // 4 m Rauschen zählen nicht
    expect(a.durationMs).toBe(3_600_000)
    expect(a.startedAt).toBe(1000)
  })
})
