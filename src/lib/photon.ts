/**
 * Ortssuche über die öffentliche Photon-Instanz (OSM-Daten).
 * Fair Use: Aufrufer debouncen, min. 3 Zeichen, alte Anfragen abbrechen; Ergebnisse
 * werden pro Sitzung zwischengespeichert. Der Browser sendet den Referer automatisch.
 */
const ENDPOINT = 'https://photon.komoot.io/api/'
export const MIN_QUERY_LENGTH = 3

export interface Place {
  id: string
  name: string
  detail: string
  lng: number
  lat: number
  /** [west, süd, ost, nord] */
  bbox?: [number, number, number, number]
}

interface PhotonFeature {
  geometry: { coordinates: [number, number] }
  properties: {
    osm_type?: string
    osm_id?: number
    name?: string
    street?: string
    housenumber?: string
    city?: string
    county?: string
    state?: string
    country?: string
    osm_value?: string
    extent?: [number, number, number, number]
  }
}

export function parsePhoton(json: { features: PhotonFeature[] }): Place[] {
  return json.features.map((f) => {
    const p = f.properties
    const name = p.name ?? ([p.street, p.housenumber].filter(Boolean).join(' ') || 'Unbenannt')
    const detail = [p.city !== name ? p.city : undefined, p.state, p.country]
      .filter(Boolean)
      .join(', ')
    const [lng, lat] = f.geometry.coordinates
    // Photon liefert extent als [west, nord, ost, süd].
    const bbox = p.extent ? ([p.extent[0], p.extent[3], p.extent[2], p.extent[1]] as Place['bbox']) : undefined
    return { id: `${p.osm_type}${p.osm_id}-${lng},${lat}`, name, detail, lng, lat, bbox }
  })
}

const cache = new Map<string, Place[]>()

export async function searchPlaces(
  query: string,
  near: { lng: number; lat: number } | undefined,
  signal: AbortSignal,
): Promise<Place[]> {
  const q = query.trim()
  if (q.length < MIN_QUERY_LENGTH) return []
  const params = new URLSearchParams({ q, limit: '6', lang: 'de' })
  if (near) {
    params.set('lat', near.lat.toFixed(2))
    params.set('lon', near.lng.toFixed(2))
  }
  const key = params.toString()
  const hit = cache.get(key)
  if (hit) return hit
  const res = await fetch(`${ENDPOINT}?${key}`, { signal })
  if (!res.ok) throw new Error(`Suche nicht verfügbar (${res.status})`)
  const places = parsePhoton(await res.json())
  cache.set(key, places)
  return places
}
