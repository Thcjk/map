import { describe, expect, it } from 'vitest'
import { cumulativeDistances, type LngLat } from '../lib/geo'
import { classifyPoi, corridorQuery, locateOnLine, thinByDistance, toPois } from './pois'

const line: LngLat[] = [
  [7, 46],
  [7.01, 46],
  [7.02, 46],
]
const cum = cumulativeDistances(line)

describe('POIs', () => {
  it('ordnet OSM-Tags Kategorien zu', () => {
    expect(classifyPoi({ tourism: 'alpine_hut' })?.category).toBe('hut')
    expect(classifyPoi({ natural: 'spring' })).toEqual({ category: 'water', kind: 'spring' })
    expect(classifyPoi({ shop: 'shoes' })).toBeNull()
  })

  it('misst Abstand und Position entlang der Route', () => {
    const r = locateOnLine(line, cum, [7.015, 46.001])
    expect(r.offRoute).toBeCloseTo(111, -1)
    expect(r.along / 1000).toBeCloseTo(1.16, 1)
  })

  it('dünnt Punkte aus', () => {
    const many: LngLat[] = Array.from({ length: 101 }, (_, i) => [7 + i * 0.0001, 46])
    expect(thinByDistance(many, 100).length).toBeLessThan(15)
  })

  it('baut den Korridor-Filter', () => {
    expect(corridorQuery(line, 1000)).toContain('(around:1000,46.00000,7.00000,46.00000,7.01000')
  })

  it('wandelt Elemente in POIs und filtert ausserhalb des Korridors', () => {
    const pois = toPois(
      [
        { type: 'node', id: 1, lat: 46.002, lon: 7.012, tags: { tourism: 'camp_site', name: 'Camping Alp' } },
        { type: 'way', id: 2, center: { lat: 46.2, lon: 7.01 }, tags: { tourism: 'hotel' } },
        { type: 'node', id: 3, lat: 46.0001, lon: 7.001, tags: { amenity: 'drinking_water' } },
      ],
      line,
      cum,
      1000,
    )
    expect(pois.map((p) => p.name)).toEqual(['Trinkwasser', 'Camping Alp'])
  })
})
