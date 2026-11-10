import { describe, expect, it } from 'vitest'
import { bbox, cumulativeDistances, distance, elevationGainLoss, indexAtDistance } from './geo'

describe('geo', () => {
  it('berechnet Distanzen plausibel', () => {
    // Bern – Zürich Luftlinie ca. 95 km
    expect(distance([7.4474, 46.948], [8.5417, 47.3769]) / 1000).toBeCloseTo(95.5, 0)
  })

  it('kumuliert Distanzen und findet Indizes', () => {
    const cum = cumulativeDistances([
      [0, 0],
      [0, 0.001],
      [0, 0.002],
    ])
    expect(cum[0]).toBe(0)
    expect(cum[2]).toBeCloseTo(222.4, 0)
    expect(indexAtDistance(cum, 100)).toBe(1)
    expect(indexAtDistance(cum, 500)).toBe(2)
  })

  it('berechnet das Begrenzungsrechteck', () => {
    expect(bbox([[1, 2], [3, -1], [0, 5]])).toEqual([0, -1, 3, 5])
  })

  it('filtert Höhenrauschen', () => {
    const noisy = [500, 502, 499, 501, 500, 520, 518, 540, 530, 510]
    const { ascent, descent } = elevationGainLoss(noisy)
    expect(ascent).toBe(40)
    expect(descent).toBe(30)
  })
})
