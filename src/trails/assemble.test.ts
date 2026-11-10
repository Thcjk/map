import { describe, expect, it } from 'vitest'
import { assembleRelation, chainWays } from './assemble'
import type { OsmElement } from './overpass'

const g = (pts: [number, number][]) => pts.map(([lon, lat]) => ({ lon, lat }))

describe('chainWays', () => {
  it('dreht Wege passend und entfernt doppelte Knoten', () => {
    const { points, gaps } = chainWays([
      [[0.002, 0], [0.001, 0]], // falsch herum
      [[0.002, 0], [0.003, 0]],
      [[0.005, 0], [0.004, 0]], // falsch herum, Lücke ~111 m
    ])
    expect(points.map((p) => p[0])).toEqual([0.001, 0.002, 0.003, 0.004, 0.005])
    expect(gaps).toBe(0)
  })

  it('zählt grössere Lücken', () => {
    expect(chainWays([[[0, 0], [0.001, 0]], [[0.01, 0], [0.011, 0]]]).gaps).toBe(1)
  })
})

describe('assembleRelation', () => {
  it('löst Super-Relationen in Reihenfolge auf und überspringt Varianten', () => {
    const elements: OsmElement[] = [
      { type: 'relation', id: 1, members: [{ type: 'relation', ref: 2, role: '' }, { type: 'relation', ref: 3, role: '' }] },
      {
        type: 'relation',
        id: 2,
        members: [
          { type: 'way', ref: 10, role: '', geometry: g([[0, 0], [0.001, 0]]) },
          { type: 'way', ref: 11, role: 'alternative', geometry: g([[5, 5], [6, 6]]) },
        ],
      },
      { type: 'relation', id: 3, members: [{ type: 'way', ref: 12, role: '', geometry: g([[0.001, 0], [0.002, 0]]) }] },
    ]
    const { points } = assembleRelation(1, elements)
    expect(points.map((p) => p[0])).toEqual([0, 0.001, 0.002])
  })
})
