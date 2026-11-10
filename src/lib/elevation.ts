import type { RoutePoint } from './geo'

/**
 * Höhen aus den Terrain Tiles (Terrarium-Kodierung, AWS Open Data) – dieselbe Quelle wie
 * das Relief. Wird für Routen ohne Höhen gebraucht (z. B. OSM-Fernwege aus Overpass).
 */
const TILE_URL = 'https://s3.amazonaws.com/elevation-tiles-prod/terrarium'
const SIZE = 256
const MAX_TILES = 160

/** Weltpixel-Koordinaten (Web Mercator) eines Punktes bei Zoom z. */
export function worldPixel(lng: number, lat: number, z: number): [number, number] {
  const scale = SIZE * 2 ** z
  const x = ((lng + 180) / 360) * scale
  const s = Math.sin((lat * Math.PI) / 180)
  const y = (0.5 - Math.log((1 + s) / (1 - s)) / (4 * Math.PI)) * scale
  return [x, y]
}

export const decodeTerrarium = (r: number, g: number, b: number) => r * 256 + g + b / 256 - 32768

/** Kleinster Detailverlust bei begrenzter Tile-Anzahl: höchster Zoom mit ≤ MAX_TILES Tiles. */
export function chooseZoom(points: RoutePoint[]): number {
  for (let z = 12; z > 8; z--) {
    const tiles = new Set<string>()
    for (const p of points) {
      const [x, y] = worldPixel(p[0], p[1], z)
      tiles.add(`${Math.floor(x / SIZE)}/${Math.floor(y / SIZE)}`)
      if (tiles.size > MAX_TILES) break
    }
    if (tiles.size <= MAX_TILES) return z
  }
  return 8
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

/** Ergänzt fehlende Höhen. Tiles werden nacheinander geladen (Routen sind räumlich geordnet). */
export async function addElevations(
  points: RoutePoint[],
  signal?: AbortSignal,
  onProgress?: (share: number) => void,
): Promise<RoutePoint[]> {
  const z = chooseZoom(points)
  const tiles = new Map<string, Promise<Float32Array>>()
  const out: RoutePoint[] = []
  for (let i = 0; i < points.length; i++) {
    const p = points[i]
    if (p[2] !== null) {
      out.push(p)
      continue
    }
    const [wx, wy] = worldPixel(p[0], p[1], z)
    const tx = Math.floor(wx / SIZE)
    const ty = Math.floor(wy / SIZE)
    const key = `${tx}/${ty}`
    if (!tiles.has(key)) tiles.set(key, loadTile(z, tx, ty, signal))
    const tile = await tiles.get(key)!
    const px = Math.min(SIZE - 1, Math.floor(wx - tx * SIZE))
    const py = Math.min(SIZE - 1, Math.floor(wy - ty * SIZE))
    out.push([p[0], p[1], Math.round(tile[py * SIZE + px])])
    if (onProgress && i % 500 === 0) onProgress(i / points.length)
  }
  return out
}
