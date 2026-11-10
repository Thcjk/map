import type { LngLat, RoutePoint } from '../lib/geo'
import { thinByDistance } from '../trails/pois'

export interface TileId {
  z: number
  x: number
  y: number
}

export function tileAt(lng: number, lat: number, z: number): TileId {
  const n = 2 ** z
  const x = Math.floor(((lng + 180) / 360) * n)
  const s = Math.sin((lat * Math.PI) / 180)
  const y = Math.floor((0.5 - Math.log((1 + s) / (1 - s)) / (4 * Math.PI)) * n)
  return { z, x: Math.min(n - 1, Math.max(0, x)), y: Math.min(n - 1, Math.max(0, y)) }
}

export const tileKey = (t: TileId) => `${t.z}/${t.x}/${t.y}`

/**
 * Alle Kacheln, die ein Korridor um die Route berührt, für die Zoomstufen minZoom…maxZoom.
 * Die Route wird dicht abgetastet und jeder Punkt in 8 Richtungen um die Korridorbreite versetzt.
 */
export function corridorTiles(points: (RoutePoint | LngLat)[], corridorM: number, minZoom: number, maxZoom: number): TileId[] {
  const samples = thinByDistance(points, Math.max(100, corridorM / 2))
  const seen = new Map<string, TileId>()
  const dirs = [-1, 0, 1]
  for (const [lng, lat] of samples) {
    const dLat = corridorM / 111_320
    const dLng = dLat / Math.cos((lat * Math.PI) / 180)
    for (let z = minZoom; z <= maxZoom; z++) {
      for (const i of dirs)
        for (const j of dirs) {
          const t = tileAt(lng + i * dLng, lat + j * dLat, z)
          seen.set(tileKey(t), t)
        }
    }
  }
  return [...seen.values()]
}
