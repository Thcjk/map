import { describe, expect, it } from 'vitest'
import type { LngLat } from '../lib/geo'
import { corridorTiles, tileAt, tileKey } from './tiles'

describe('Offline-Kacheln', () => {
  it('rechnet Koordinaten in Kacheln um', () => {
    expect(tileAt(0, 0, 1)).toEqual({ z: 1, x: 1, y: 1 })
    // Bern bei Zoom 10
    expect(tileKey(tileAt(7.4474, 46.948, 10))).toBe('10/533/360')
  })

  it('deckt den Korridor ohne Lücken und ohne Duplikate ab', () => {
    // 20 km nach Osten
    const line: LngLat[] = Array.from({ length: 201 }, (_, i) => [7 + i * 0.0013, 46.5])
    const tiles = corridorTiles(line, 1000, 12, 14)
    const keys = tiles.map(tileKey)
    expect(new Set(keys).size).toBe(keys.length)
    const z14 = tiles.filter((t) => t.z === 14)
    const xs = z14.map((t) => t.x)
    // durchgehend von der ersten bis zur letzten Spalte
    expect(new Set(xs).size).toBe(Math.max(...xs) - Math.min(...xs) + 1)
    // Korridor von 1 km braucht bei Zoom 14 (ca. 1.7 km pro Kachel) 2–3 Zeilen
    const rows = new Set(z14.map((t) => t.y)).size
    expect(rows).toBeGreaterThanOrEqual(2)
    expect(rows).toBeLessThanOrEqual(3)
    expect(tiles.length).toBeLessThan(120)
  })
})
