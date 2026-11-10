import type { LngLat, RoutePoint } from './geo'

export interface GpxData {
  name: string
  /** Track- oder Routenpunkte (alle Segmente aneinandergehängt). */
  points: RoutePoint[]
  waypoints: { name: string; lng: number; lat: number }[]
  /** Zeitstempel pro Punkt (ms), falls vorhanden – für aufgezeichnete Touren. */
  times: (number | null)[]
}

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

export function toGpx(name: string, points: RoutePoint[], waypoints: LngLat[] = [], creator = 'Wanderapp'): string {
  const wpts = waypoints
    .map(([lng, lat], i) => `  <wpt lat="${lat.toFixed(6)}" lon="${lng.toFixed(6)}"><name>${i + 1}</name></wpt>`)
    .join('\n')
  const trkpts = points
    .map(
      ([lng, lat, ele]) =>
        `      <trkpt lat="${lat.toFixed(6)}" lon="${lng.toFixed(6)}">${ele === null ? '' : `<ele>${ele.toFixed(1)}</ele>`}</trkpt>`,
    )
    .join('\n')
  return `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="${esc(creator)}" xmlns="http://www.topografix.com/GPX/1/1">
  <metadata><name>${esc(name)}</name></metadata>
${wpts ? wpts + '\n' : ''}  <trk>
    <name>${esc(name)}</name>
    <trkseg>
${trkpts}
    </trkseg>
  </trk>
</gpx>
`
}

export function parseGpx(xml: string): GpxData {
  const doc = new DOMParser().parseFromString(xml, 'application/xml')
  if (doc.getElementsByTagName('parsererror').length) throw new Error('Die Datei ist kein gültiges GPX.')
  const byTag = (el: Element | Document, tag: string) => Array.from(el.getElementsByTagName(tag))
  const text = (el: Element, tag: string) => el.getElementsByTagName(tag)[0]?.textContent?.trim()

  let pts = byTag(doc, 'trkpt')
  if (pts.length === 0) pts = byTag(doc, 'rtept')
  const points: RoutePoint[] = []
  const times: (number | null)[] = []
  for (const p of pts) {
    const lat = Number(p.getAttribute('lat'))
    const lng = Number(p.getAttribute('lon'))
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue
    const ele = text(p, 'ele')
    const time = text(p, 'time')
    points.push([lng, lat, ele !== undefined && ele !== '' ? Number(ele) : null])
    times.push(time ? Date.parse(time) || null : null)
  }
  if (points.length < 2) throw new Error('Das GPX enthält keinen Track und keine Route.')

  const waypoints = byTag(doc, 'wpt').map((w, i) => ({
    name: text(w, 'name') ?? `Punkt ${i + 1}`,
    lng: Number(w.getAttribute('lon')),
    lat: Number(w.getAttribute('lat')),
  }))
  const firstName = (tag: string) => {
    const el = byTag(doc, tag)[0]
    return el ? text(el, 'name') : undefined
  }
  const name = firstName('trk') ?? firstName('rte') ?? firstName('metadata') ?? 'Importierte Tour'
  return { name, points, waypoints, times }
}
