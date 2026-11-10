/**
 * Overpass API (OSM-Daten). Usage Policy: moderate Nutzung, Ergebnisse cachen,
 * keine parallelen Massenabfragen. Wir fragen nur auf Nutzeraktion hin ab und
 * speichern Ergebnisse in IndexedDB (siehe trails/cache.ts).
 */
const ENDPOINTS = ['https://overpass-api.de/api/interpreter', 'https://overpass.private.coffee/api/interpreter']

export interface OsmElement {
  type: 'node' | 'way' | 'relation'
  id: number
  lat?: number
  lon?: number
  center?: { lat: number; lon: number }
  tags?: Record<string, string>
  geometry?: { lat: number; lon: number }[]
  members?: { type: 'node' | 'way' | 'relation'; ref: number; role: string; geometry?: { lat: number; lon: number }[] }[]
}

export async function overpass(query: string, signal?: AbortSignal): Promise<OsmElement[]> {
  let lastError: unknown
  for (const url of ENDPOINTS) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        body: new URLSearchParams({ data: query }),
        signal,
      })
      if (res.status === 429 || res.status === 504) {
        lastError = new Error('Der OSM-Dienst ist gerade überlastet. Bitte in einer Minute erneut versuchen.')
        continue
      }
      if (!res.ok) throw new Error(`OSM-Abfrage fehlgeschlagen (${res.status})`)
      const json = (await res.json()) as { elements: OsmElement[]; remark?: string }
      if (json.remark && /runtime error|timed out/i.test(json.remark)) {
        lastError = new Error('Die OSM-Abfrage dauerte zu lange. Bitte einen kleineren Ausschnitt wählen.')
        continue
      }
      return json.elements
    } catch (e) {
      if (signal?.aborted) throw e
      lastError = e
    }
  }
  throw lastError instanceof Error ? lastError : new Error('OSM-Dienst nicht erreichbar.')
}

/** Overpass-Regex sicher machen (Nutzereingabe). */
export function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\"]/g, '\\$&')
}
