import { cumulativeDistances, distance, type LngLat, type RoutePoint } from '../lib/geo'
import { thinByDistance } from '../trails/pois'

/** Ein Wegpunkt gilt als begangen, wenn eine eigene Spur näher als so viele Meter liegt. */
export const TOLERANCE_M = 60
const CELL_DEG = 0.001 // ca. 110 m (Breite), in der Länge etwas weniger

const cell = (lng: number, lat: number) => `${Math.floor(lng / CELL_DEG)}:${Math.floor(lat / CELL_DEG)}`

/** Räumlicher Index über alle eigenen Spuren (Punkte auf höchstens 40 m verdichtet). */
export function buildTrackIndex(tracks: (RoutePoint | LngLat)[][]): Map<string, LngLat[]> {
  const index = new Map<string, LngLat[]>()
  const add = (p: LngLat) => {
    const k = cell(p[0], p[1])
    const list = index.get(k)
    if (list) list.push(p)
    else index.set(k, [p])
  }
  for (const track of tracks) {
    for (let i = 0; i < track.length; i++) {
      const a = track[i]
      add([a[0], a[1]])
      const b = track[i + 1]
      if (!b) continue
      const d = distance(a, b)
      // Lücken über 500 m sind eher Signalverlust als begangener Weg: nicht auffüllen.
      if (d > 40 && d < 500) {
        const n = Math.ceil(d / 40)
        for (let j = 1; j < n; j++) add([a[0] + ((b[0] - a[0]) * j) / n, a[1] + ((b[1] - a[1]) * j) / n])
      }
    }
  }
  return index
}

function isNear(index: Map<string, LngLat[]>, p: LngLat): boolean {
  const cx = Math.floor(p[0] / CELL_DEG)
  const cy = Math.floor(p[1] / CELL_DEG)
  for (let dx = -1; dx <= 1; dx++)
    for (let dy = -1; dy <= 1; dy++) {
      const list = index.get(`${cx + dx}:${cy + dy}`)
      if (list?.some((q) => distance(p, q) <= TOLERANCE_M)) return true
    }
  return false
}

/** Anteil (0…1) der Weglänge, der von eigenen Spuren abgedeckt ist, und die begangenen km. */
export function coverage(trail: (RoutePoint | LngLat)[], index: Map<string, LngLat[]>): { share: number; coveredM: number; totalM: number } {
  const samples = thinByDistance(trail, 100)
  const totalM = cumulativeDistances(samples).at(-1) ?? 0
  if (samples.length < 2 || index.size === 0) return { share: 0, coveredM: 0, totalM }
  let covered = 0
  for (let i = 1; i < samples.length; i++) {
    if (isNear(index, samples[i]) && isNear(index, samples[i - 1])) covered += distance(samples[i - 1], samples[i])
  }
  return { share: totalM ? covered / totalM : 0, coveredM: covered, totalM }
}
