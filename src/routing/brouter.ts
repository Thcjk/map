import type { LngLat, RoutePoint } from '../lib/geo'
import type { Leg, RoutingProvider, WaySegment } from './types'
import { classifySac, classifySurface, parseTags } from './wayInfo'

/**
 * BRouter, öffentliche Instanz brouter.de (Profil «hiking-mountain»).
 * Die Instanz ist ein freiwilliger, kostenloser Dienst: Anfragen nur pro Teilstück,
 * gecacht und debounced (siehe useRouting).
 */
const ENDPOINT = 'https://brouter.de/brouter'
const PROFILE = 'hiking-mountain'

interface BRouterGeoJson {
  features: {
    geometry: { coordinates: [number, number, number?][] }
    properties: { messages?: string[][] }
  }[]
}

export function parseBRouter(json: BRouterGeoJson): Leg {
  const feature = json.features[0]
  const points: RoutePoint[] = feature.geometry.coordinates.map(([lng, lat, ele]) => [
    lng,
    lat,
    ele ?? null,
  ])
  const ways: WaySegment[] = []
  const messages = feature.properties.messages ?? []
  if (messages.length > 1) {
    const header = messages[0]
    const iLon = header.indexOf('Longitude')
    const iLat = header.indexOf('Latitude')
    const iTags = header.indexOf('WayTags')
    let from = 0
    let search = 0
    for (const row of messages.slice(1)) {
      // Jede Zeile beschreibt den Abschnitt bis zu ihrem Endpunkt (Mikrograd).
      const lng = Number(row[iLon]) / 1e6
      const lat = Number(row[iLat]) / 1e6
      let to = search
      while (
        to < points.length - 1 &&
        !(Math.abs(points[to][0] - lng) < 2e-6 && Math.abs(points[to][1] - lat) < 2e-6)
      )
        to++
      search = to
      const tags = parseTags(row[iTags] ?? '')
      const surface = classifySurface(tags)
      const sac = classifySac(tags)
      const last = ways[ways.length - 1]
      if (to > from) {
        if (last && last.surface === surface && last.sac === sac) last.to = to
        else ways.push({ from, to, surface, sac })
        from = to
      }
    }
    if (from < points.length - 1) {
      const last = ways[ways.length - 1]
      if (last) last.to = points.length - 1
    }
  }
  return { points, ways, routed: true }
}

export const brouter: RoutingProvider = {
  id: 'brouter',
  label: 'BRouter (brouter.de)',
  async routeLeg(from: LngLat, to: LngLat, signal: AbortSignal): Promise<Leg> {
    const lonlats = [from, to].map(([lng, lat]) => `${lng.toFixed(6)},${lat.toFixed(6)}`).join('|')
    const url = `${ENDPOINT}?lonlats=${lonlats}&profile=${PROFILE}&alternativeidx=0&format=geojson`
    const res = await fetch(url, { signal })
    if (!res.ok) {
      const text = await res.text().catch(() => '')
      throw new Error(text.trim() || `Routing nicht verfügbar (${res.status})`)
    }
    return parseBRouter(await res.json())
  },
}
