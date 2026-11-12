import type { RoutePoint } from './geo'

/**
 * Höhen aus den Terrain Tiles (Terrarium-Kodierung, AWS Open Data) – dieselbe Quelle wie
 * das Relief. Wird für Routen ohne Höhen gebraucht (z. B. OSM-Fernwege aus Overpass).
 */
const TILE_URL = 'https://s3.amazonaws.com/elevation-tiles-prod/terrarium'
const SIZE = 256
const MAX_TILES = 240
const CONCURRENCY = 6

/** Weltpixel-Koordinaten (Web Mercator) eines Punktes bei Zoom z. */
export function worldPixel(lng: number, lat: number, z: number): [number, number] {
  const scale = SIZE * 2 ** z
  const x = ((lng + 180) / 360) * scale
  const s = Math.sin((lat * Math.PI) / 180)
  const y = (0.5 - Math.log((1 + s) / (1 - s)) / (4 * Math.PI)) * scale
  return [x, y]
}

export const decodeTerrarium = (r: number, g: number, b: number) => r * 256 + g + b / 256 - 32768

/**
 * Höchster Zoom mit höchstens MAX_TILES Kacheln. Zoom 12 entspricht rund 25 m pro Pixel,
 * Zoom 10 rund 100 m: Je länger der Weg, desto gröber die Höhen (und desto ungenauer die
 * Höhenmeter). Der gewählte Zoom wird zurückgegeben, damit die App das anzeigen kann.
 */
export function chooseZoom(points: RoutePoint[]): number {
  for (let z = 12; z > 9; z--) {
    const tiles = new Set<string>()
    for (const p of points) {
      const [x, y] = worldPixel(p[0], p[1], z)
      tiles.add(`${Math.floor(x / SIZE)}/${Math.floor(y / SIZE)}`)
      if (tiles.size > MAX_TILES) break
    }
    if (tiles.size <= MAX_TILES) return z
  }
  return 9
}

/** Bilineare Interpolation zwischen den vier umliegenden Pixeln (innerhalb der Kachel). */
export function sampleBilinear(tile: Float32Array, px: number, py: number): number {
  const x = Math.min(SIZE - 1, Math.max(0, px - 0.5))
  const y = Math.min(SIZE - 1, Math.max(0, py - 0.5))
  const x0 = Math.floor(x)
  const y0 = Math.floor(y)
  const x1 = Math.min(SIZE - 1, x0 + 1)
  const y1 = Math.min(SIZE - 1, y0 + 1)
  const fx = x - x0
  const fy = y - y0
  const top = tile[y0 * SIZE + x0] * (1 - fx) + tile[y0 * SIZE + x1] * fx
  const bottom = tile[y1 * SIZE + x0] * (1 - fx) + tile[y1 * SIZE + x1] * fx
  return top * (1 - fy) + bottom * fy
}

async function loadTile(z: number, x: number, y: number, signal?: AbortSignal): Promise<Float32Array> {
  const res = await fetch(`${TILE_URL}/${z}/${x}/${y}.png`, { signal })
  if (!res.ok) throw new Error(`Höhendaten nicht verfügbar (${res.status})`)
  const bmp = await createImageBitmap(await res.blob())
  const canvas = new OffscreenCanvas(SIZE, SIZE)
  const ctx = canvas.getContext('2d')!
  ctx.drawImage(bmp, 0, 0)
  const { data } = ctx.getImageData(0, 0, SIZE, SIZE)
  const out = new Float32Array(SIZE * SIZE)
  for (let i = 0; i < out.length; i++) out[i] = decodeTerrarium(data[i * 4], data[i * 4 + 1], data[i * 4 + 2])
  return out
}

/** Ergänzt fehlende Höhen. Die Kacheln werden parallel geladen (höchstens 6 gleichzeitig). */
export async function addElevations(
  points: RoutePoint[],
  signal?: AbortSignal,
  onProgress?: (share: number) => void,
): Promise<RoutePoint[]> {
  const z = chooseZoom(points)
  const located = points.map((p) => {
    const [wx, wy] = worldPixel(p[0], p[1], z)
    const tx = Math.floor(wx / SIZE)
    const ty = Math.floor(wy / SIZE)
    return { key: `${tx}/${ty}`, tx, ty, px: wx - tx * SIZE, py: wy - ty * SIZE }
  })
  const needed = [...new Map(located.filter((_, i) => points[i][2] === null).map((l) => [l.key, l])).values()]
  const tiles = new Map<string, Float32Array>()
  let next = 0
  let done = 0
  await Promise.all(
    Array.from({ length: Math.min(CONCURRENCY, needed.length) }, async () => {
      while (next < needed.length) {
        const t = needed[next++]
        tiles.set(t.key, await loadTile(z, t.tx, t.ty, signal))
        onProgress?.(++done / needed.length)
      }
    }),
  )
  return points.map((p, i) => {
    if (p[2] !== null) return p
    const l = located[i]
    return [p[0], p[1], Math.round(sampleBilinear(tiles.get(l.key)!, l.px, l.py))]
  })
}
