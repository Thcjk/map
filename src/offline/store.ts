import * as maplibregl from 'maplibre-gl'
import { db, type OfflineRegion } from '../lib/db'
import type { RoutePoint } from '../lib/geo'
import { corridorTiles, tileKey, type TileId } from './tiles'

/**
 * Offline-Karten für den Korridor um eine Route.
 *
 * Erlaubt und umgesetzt (Details in DATENQUELLEN.md):
 * - Grundkarte (OpenFreeMap-Vektorkacheln): nur Korridor, gedrosselt, mit Obergrenze.
 * - Höhenmodell (Terrain Tiles, AWS Open Data): frei nutzbar.
 * Nicht erlaubt und darum nicht herunterladbar: swisstopo-Dienste, Waymarked Trails.
 *
 * Vektorkacheln liegen unter einem eigenen Schlüssel (z/x/y) im Cache, weil die
 * Kachel-URL von OpenFreeMap eine wöchentlich wechselnde Version enthält.
 */
const OMT_TILEJSON = 'https://tiles.openfreemap.org/planet'
const DEM_URL = 'https://s3.amazonaws.com/elevation-tiles-prod/terrarium'
const FONT_URL = 'https://tiles.openfreemap.org/fonts'
export const OMT_CACHE = 'offline-omt'
/** Gleiche Namen wie die Laufzeit-Caches des Service Workers (vite.config.ts). */
export const DEM_CACHE = 'dem-tiles'
export const FONT_CACHE = 'map-fonts'
export const OMT_PROTOCOL = 'etappa-omt'

export const OMT_ZOOMS = [6, 14] as const
export const DEM_ZOOMS = [8, 13] as const
export const MAX_TILES = 4000
const CONCURRENCY = 4
/** Grobe Durchschnittsgrössen für die Schätzung vor dem Download. */
const AVG_OMT_BYTES = 45_000
const AVG_DEM_BYTES = 75_000

const omtKey = (key: string) => `https://offline.invalid/omt/${key}`
const demUrl = (key: string) => `${DEM_URL}/${key}.png`

let template: Promise<string> | null = null
function omtTemplate(): Promise<string> {
  template ??= fetch(OMT_TILEJSON)
    .then((r) => r.json() as Promise<{ tiles: string[] }>)
    .then((j) => j.tiles[0])
    .catch((e) => {
      template = null
      throw e
    })
  return template
}

/** MapLibre-Protokoll: zuerst der Offline-Cache, sonst das Netz. */
export function registerOfflineProtocol() {
  maplibregl.addProtocol(OMT_PROTOCOL, async (params, abort) => {
    const key = params.url.slice(`${OMT_PROTOCOL}://`.length)
    const hit = 'caches' in self ? await (await caches.open(OMT_CACHE)).match(omtKey(key)) : undefined
    if (hit) return { data: await hit.arrayBuffer() }
    const [z, x, y] = key.split('/')
    const url = (await omtTemplate()).replace('{z}', z).replace('{x}', x).replace('{y}', y)
    const res = await fetch(url, { signal: abort.signal })
    if (!res.ok) throw new Error(`Kachel ${key}: ${res.status}`)
    return { data: await res.arrayBuffer() }
  })
}

export interface DownloadPlan {
  omt: TileId[]
  dem: TileId[]
  estimatedBytes: number
  tooLarge: boolean
}

export function planDownload(points: RoutePoint[], corridorM: number): DownloadPlan {
  const omt = corridorTiles(points, corridorM, OMT_ZOOMS[0], OMT_ZOOMS[1])
  const dem = corridorTiles(points, corridorM, DEM_ZOOMS[0], DEM_ZOOMS[1])
  return {
    omt,
    dem,
    estimatedBytes: omt.length * AVG_OMT_BYTES + dem.length * AVG_DEM_BYTES,
    tooLarge: omt.length + dem.length > MAX_TILES,
  }
}

async function pool<T>(items: T[], worker: (item: T) => Promise<void>, signal: AbortSignal) {
  let i = 0
  await Promise.all(
    Array.from({ length: CONCURRENCY }, async () => {
      while (i < items.length) {
        if (signal.aborted) throw new DOMException('Abgebrochen', 'AbortError')
        await worker(items[i++])
      }
    }),
  )
}

export async function downloadRegion(
  name: string,
  points: RoutePoint[],
  corridorM: number,
  signal: AbortSignal,
  onProgress: (done: number, total: number) => void,
): Promise<OfflineRegion> {
  const plan = planDownload(points, corridorM)
  if (plan.tooLarge) throw new Error('Der Ausschnitt ist zu gross. Bitte die Route in Etappen herunterladen oder den Korridor verkleinern.')
  // Speicher dauerhaft anfordern, damit der Browser die Karten nicht von sich aus löscht.
  await navigator.storage?.persist?.()
  const [omtCache, demCache, fontCache] = await Promise.all([caches.open(OMT_CACHE), caches.open(DEM_CACHE), caches.open(FONT_CACHE)])
  const tpl = await omtTemplate()
  const total = plan.omt.length + plan.dem.length
  let done = 0
  let bytes = 0
  let failed = 0
  const tick = () => onProgress(++done, total)

  const store = async (cache: Cache, key: string, url: string) => {
    if (await cache.match(key)) return
    const res = await fetch(url, { signal })
    // Kacheln ohne Inhalt (z. B. Meer) liefern 204/404: kein Fehler.
    if (res.status === 404 || res.status === 204) return
    if (!res.ok) throw new Error(String(res.status))
    const blob = await res.blob()
    bytes += blob.size
    await cache.put(key, new Response(blob, { headers: { 'Content-Type': res.headers.get('Content-Type') ?? 'application/octet-stream' } }))
  }
  const safe = (fn: () => Promise<void>) => async () => {
    try {
      await fn()
    } catch (e) {
      if (signal.aborted) throw e
      failed++
    }
    tick()
  }

  await pool(plan.omt, (t) => safe(() => store(omtCache, omtKey(tileKey(t)), tpl.replace('{z}', String(t.z)).replace('{x}', String(t.x)).replace('{y}', String(t.y))))(), signal)
  await pool(plan.dem, (t) => safe(() => store(demCache, demUrl(tileKey(t)), demUrl(tileKey(t))))(), signal)
  // Schriften für Ortsnamen und Höhenzahlen (lateinische Bereiche)
  const fonts = ['Noto Sans Regular', 'Noto Sans Bold', 'Noto Sans Italic'].flatMap((f) =>
    ['0-255', '256-511', '8192-8447'].map((r) => `${FONT_URL}/${encodeURIComponent(f)}/${r}.pbf`),
  )
  await pool(fonts, (u) => store(fontCache, u, u).catch(() => undefined), signal)

  if (failed > total * 0.2) throw new Error('Zu viele Kacheln konnten nicht geladen werden. Bitte mit besserer Verbindung erneut versuchen.')
  const region: OfflineRegion = {
    id: crypto.randomUUID(),
    name,
    createdAt: Date.now(),
    corridor: corridorM,
    omt: plan.omt.map(tileKey),
    dem: plan.dem.map(tileKey),
    bytes,
    failed,
  }
  await db.offlineRegions.put(region)
  return region
}

/** Region löschen; Kacheln, die eine andere Region noch braucht, bleiben. */
export async function deleteRegion(id: string) {
  const region = await db.offlineRegions.get(id)
  if (!region) return
  await db.offlineRegions.delete(id)
  const others = await db.offlineRegions.toArray()
  const keepOmt = new Set(others.flatMap((r) => r.omt))
  const keepDem = new Set(others.flatMap((r) => r.dem))
  const [omtCache, demCache] = await Promise.all([caches.open(OMT_CACHE), caches.open(DEM_CACHE)])
  await Promise.all([
    ...region.omt.filter((k) => !keepOmt.has(k)).map((k) => omtCache.delete(omtKey(k))),
    ...region.dem.filter((k) => !keepDem.has(k)).map((k) => demCache.delete(demUrl(k))),
  ])
}

export const listRegions = () => db.offlineRegions.orderBy('createdAt').reverse().toArray()

export function formatBytes(b: number): string {
  return b < 1e6 ? `${Math.max(1, Math.round(b / 1e3))} kB` : `${(b / 1e6).toFixed(b < 1e7 ? 1 : 0)} MB`
}
