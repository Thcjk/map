import { cumulativeDistances, distance, type LngLat, type RoutePoint } from '../lib/geo'
import { overpass, type OsmElement } from './overpass'

export type PoiCategory = 'hut' | 'camping' | 'lodging' | 'water' | 'shop'

export const POI_CATEGORIES: { id: PoiCategory; label: string; color: string; sleep: boolean }[] = [
  { id: 'hut', label: 'Hütten', color: '#e0533d', sleep: true },
  { id: 'camping', label: 'Camping', color: '#3fa34d', sleep: true },
  { id: 'lodging', label: 'Unterkünfte', color: '#8e6be8', sleep: true },
  { id: 'water', label: 'Wasser', color: '#2f9bea', sleep: false },
  { id: 'shop', label: 'Einkauf', color: '#e8b33a', sleep: false },
]

export interface Poi {
  id: string
  category: PoiCategory
  name: string
  kind: string
  lng: number
  lat: number
  /** Abstand zur Route in m. */
  offRoute: number
  /** Position entlang der Route in m. */
  along: number
  website?: string
  phone?: string
}

const KIND_LABELS: Record<string, string> = {
  alpine_hut: 'Berghütte',
  wilderness_hut: 'Unbewartete Hütte',
  camp_site: 'Campingplatz',
  hotel: 'Hotel',
  hostel: 'Hostel',
  guest_house: 'Pension',
  chalet: 'Ferienhaus',
  motel: 'Motel',
  drinking_water: 'Trinkwasser',
  water_point: 'Wasserstelle',
  spring: 'Quelle',
  supermarket: 'Supermarkt',
  convenience: 'Laden',
  bakery: 'Bäckerei',
  general: 'Dorfladen',
}

export function classifyPoi(tags: Record<string, string>): { category: PoiCategory; kind: string } | null {
  const t = tags.tourism
  if (t === 'alpine_hut' || t === 'wilderness_hut') return { category: 'hut', kind: t }
  if (t === 'camp_site') return { category: 'camping', kind: t }
  if (t && ['hotel', 'hostel', 'guest_house', 'chalet', 'motel'].includes(t)) return { category: 'lodging', kind: t }
  if (tags.amenity === 'drinking_water' || tags.amenity === 'water_point') return { category: 'water', kind: tags.amenity }
  if (tags.natural === 'spring') return { category: 'water', kind: 'spring' }
  if (tags.shop && ['supermarket', 'convenience', 'bakery', 'general'].includes(tags.shop))
    return { category: 'shop', kind: tags.shop }
  return null
}

export const kindLabel = (kind: string) => KIND_LABELS[kind] ?? kind

/** Ausdünnen: höchstens ein Punkt pro `step` Meter (Anfang und Ende bleiben). */
export function thinByDistance(points: (LngLat | RoutePoint)[], step: number): LngLat[] {
  if (!points.length) return []
  const out: LngLat[] = [[points[0][0], points[0][1]]]
  let acc = 0
  for (let i = 1; i < points.length; i++) {
    acc += distance(points[i - 1], points[i])
    if (acc >= step || i === points.length - 1) {
      out.push([points[i][0], points[i][1]])
      acc = 0
    }
  }
  return out
}

/** Nächster Punkt auf der Linie: Abstand und Position entlang der Linie (m). */
export function locateOnLine(line: LngLat[], cum: number[], p: LngLat): { offRoute: number; along: number } {
  let best = { offRoute: Infinity, along: 0 }
  const cosLat = Math.cos((p[1] * Math.PI) / 180)
  for (let i = 1; i < line.length; i++) {
    const a = line[i - 1]
    const b = line[i]
    // Projektion in lokaler, flacher Näherung
    const ax = (a[0] - p[0]) * cosLat
    const ay = a[1] - p[1]
    const bx = (b[0] - p[0]) * cosLat
    const by = b[1] - p[1]
    const dx = bx - ax
    const dy = by - ay
    const len2 = dx * dx + dy * dy
    const t = len2 ? Math.min(1, Math.max(0, -(ax * dx + ay * dy) / len2)) : 0
    const q: LngLat = [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]
    const d = distance(q, p)
    if (d < best.offRoute) best = { offRoute: d, along: cum[i - 1] + (cum[i] - cum[i - 1]) * t }
  }
  return best
}

export function corridorQuery(line: LngLat[], radius: number): string {
  const coords = line.map(([lng, lat]) => `${lat.toFixed(5)},${lng.toFixed(5)}`).join(',')
  const around = `(around:${radius},${coords})`
  return `[out:json][timeout:90];(
nwr["tourism"~"^(alpine_hut|wilderness_hut|camp_site|hotel|hostel|guest_house|chalet|motel)$"]${around};
nwr["amenity"~"^(drinking_water|water_point)$"]${around};
node["natural"="spring"]${around};
nwr["shop"~"^(supermarket|convenience|bakery|general)$"]${around};
);out center tags;`
}

export function toPois(elements: OsmElement[], line: LngLat[], cum: number[], radius: number): Poi[] {
  const seen = new Set<string>()
  const out: Poi[] = []
  for (const e of elements) {
    const id = `${e.type}/${e.id}`
    if (seen.has(id) || !e.tags) continue
    seen.add(id)
    const c = classifyPoi(e.tags)
    const lat = e.lat ?? e.center?.lat
    const lng = e.lon ?? e.center?.lon
    if (!c || lat === undefined || lng === undefined) continue
    const loc = locateOnLine(line, cum, [lng, lat])
    if (loc.offRoute > radius * 1.05) continue
    out.push({
      id,
      ...c,
      name: e.tags.name ?? kindLabel(c.kind),
      lng,
      lat,
      ...loc,
      website: e.tags.website ?? e.tags['contact:website'],
      phone: e.tags.phone ?? e.tags['contact:phone'],
    })
  }
  return out.sort((a, b) => a.along - b.along)
}

const CHUNK_POINTS = 350

/** POIs im Korridor um die Route, abschnittweise abgefragt (schont Overpass). */
export async function fetchPois(
  points: RoutePoint[],
  radius: number,
  signal?: AbortSignal,
  onProgress?: (share: number) => void,
): Promise<Poi[]> {
  const line = thinByDistance(points, Math.max(150, radius / 3))
  const cum = cumulativeDistances(line)
  const elements: OsmElement[] = []
  for (let i = 0; i < line.length; i += CHUNK_POINTS - 1) {
    const chunk = line.slice(i, i + CHUNK_POINTS)
    if (chunk.length < 2 && i > 0) break
    elements.push(...(await overpass(corridorQuery(chunk, radius), signal)))
    onProgress?.(Math.min(1, (i + CHUNK_POINTS) / line.length))
  }
  return toPois(elements, line, cum, radius)
}
