import { useCallback, useEffect, useRef } from 'react'
import * as maplibregl from 'maplibre-gl'
import type { GeoJSONSource, Map as MlMap, MapMouseEvent } from 'maplibre-gl'
import { useMap } from '../map/MapContext'
import { useAppLayers } from '../map/useAppLayers'
import type { LngLat } from '../lib/geo'
import type { Route } from '../routing/route'
import type { FeatureCollection } from 'geojson'
import { SOURCES } from '../data/sources'

interface Props {
  route: Route | null
  waypoints: LngLat[]
  /** Wegpunkte setzen und verschieben erlaubt? */
  editable: boolean
  highlightIndex: number | null
  selected: number | null
  onAdd: (at: LngLat) => void
  onInsert: (index: number, at: LngLat) => void
  onMove: (index: number, to: LngLat) => void
  onSelect: (index: number | null) => void
}

const ROUTE = 'app-route'
const HIGHLIGHT = 'app-route-highlight'
const empty: FeatureCollection = { type: 'FeatureCollection', features: [] }

function routeGeoJson(route: Route | null): FeatureCollection {
  if (!route) return empty
  return {
    type: 'FeatureCollection',
    features: route.legRanges.map((r) => ({
      type: 'Feature',
      properties: { routed: r.routed },
      geometry: {
        type: 'LineString',
        coordinates: route.points.slice(r.from, r.to + 1).map((p) => [p[0], p[1]]),
      },
    })),
  }
}

export default function RouteLayer(props: Props) {
  const map = useMap()
  const latest = useRef(props)
  latest.current = props

  const setup = useCallback((m: MlMap) => {
    if (!m.getSource(ROUTE))
      m.addSource(ROUTE, {
        type: 'geojson',
        data: routeGeoJson(latest.current.route),
        attribution: SOURCES.find((s) => s.id === 'brouter')!.attribution,
      })
    if (!m.getSource(HIGHLIGHT)) m.addSource(HIGHLIGHT, { type: 'geojson', data: empty })
    if (!m.getLayer(`${ROUTE}-casing`))
      m.addLayer({
        id: `${ROUTE}-casing`,
        type: 'line',
        source: ROUTE,
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: { 'line-color': '#1a0d03', 'line-width': 9, 'line-opacity': 0.55 },
      })
    if (!m.getLayer(`${ROUTE}-line`))
      m.addLayer({
        id: `${ROUTE}-line`,
        type: 'line',
        source: ROUTE,
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        filter: ['==', ['get', 'routed'], true],
        paint: { 'line-color': '#ff7a1a', 'line-width': 5 },
      })
    // Luftlinie (Routing nicht verfügbar oder noch unterwegs) gestrichelt
    if (!m.getLayer(`${ROUTE}-air`))
      m.addLayer({
        id: `${ROUTE}-air`,
        type: 'line',
        source: ROUTE,
        filter: ['==', ['get', 'routed'], false],
        paint: { 'line-color': '#ff7a1a', 'line-width': 4, 'line-dasharray': [1.5, 1.5] },
      })
    if (!m.getLayer(HIGHLIGHT))
      m.addLayer({
        id: HIGHLIGHT,
        type: 'circle',
        source: HIGHLIGHT,
        paint: {
          'circle-radius': 8,
          'circle-color': '#ffffff',
          'circle-stroke-color': '#ff7a1a',
          'circle-stroke-width': 4,
        },
      })
  }, [])
  useAppLayers(map, setup)

  // Routengeometrie aktualisieren
  useEffect(() => {
    ;(map?.getSource(ROUTE) as GeoJSONSource | undefined)?.setData(routeGeoJson(props.route))
  }, [map, props.route])

  // Markierter Punkt aus dem Höhenprofil
  useEffect(() => {
    const src = map?.getSource(HIGHLIGHT) as GeoJSONSource | undefined
    const p = props.highlightIndex !== null ? props.route?.points[props.highlightIndex] : undefined
    src?.setData(
      p ? { type: 'Feature', properties: {}, geometry: { type: 'Point', coordinates: [p[0], p[1]] } } : empty,
    )
  }, [map, props.route, props.highlightIndex])

  // Tippen auf die Karte: Wegpunkt anhängen; Tippen auf die Linie: Wegpunkt einfügen.
  useEffect(() => {
    if (!map) return
    const onClick = (e: MapMouseEvent) => {
      const p = latest.current
      if (!p.editable) return
      const at: LngLat = [e.lngLat.lng, e.lngLat.lat]
      const box: [[number, number], [number, number]] = [
        [e.point.x - 10, e.point.y - 10],
        [e.point.x + 10, e.point.y + 10],
      ]
      const layers = [`${ROUTE}-line`, `${ROUTE}-air`].filter((id) => map.getLayer(id))
      const onLine = layers.length > 0 && map.queryRenderedFeatures(box, { layers }).length > 0
      if (onLine && p.route && p.waypoints.length >= 2) {
        const idx = nearestPointIndex(p.route, at)
        const leg = p.route.legRanges.findIndex((r) => idx >= r.from && idx <= r.to)
        if (leg >= 0) {
          p.onInsert(leg + 1, at)
          return
        }
      }
      p.onSelect(null)
      p.onAdd(at)
    }
    map.on('click', onClick)
    return () => {
      map.off('click', onClick)
    }
  }, [map])

  // Wegpunkt-Marker (verschiebbar)
  useEffect(() => {
    if (!map) return
    const markers = props.waypoints.map((wp, i) => {
      const el = document.createElement('button')
      el.type = 'button'
      const isEnd = i === props.waypoints.length - 1 && i > 0
      el.className = `waypoint-marker${i === 0 ? ' is-start' : ''}${isEnd ? ' is-end' : ''}${
        props.selected === i ? ' is-selected' : ''
      }`
      el.textContent = String(i + 1)
      el.setAttribute('aria-label', `Wegpunkt ${i + 1}`)
      el.addEventListener('click', (ev) => {
        ev.stopPropagation()
        latest.current.onSelect(latest.current.selected === i ? null : i)
      })
      const marker = new maplibregl.Marker({ element: el, draggable: props.editable })
        .setLngLat(wp)
        .addTo(map)
      marker.on('dragend', () => {
        const ll = marker.getLngLat()
        latest.current.onMove(i, [ll.lng, ll.lat])
      })
      return marker
    })
    return () => markers.forEach((m) => m.remove())
  }, [map, props.waypoints, props.editable, props.selected])

  return null
}

function nearestPointIndex(route: Route, at: LngLat): number {
  let best = 0
  let bestD = Infinity
  const cosLat = Math.cos((at[1] * Math.PI) / 180)
  route.points.forEach((p, i) => {
    const d = ((p[0] - at[0]) * cosLat) ** 2 + (p[1] - at[1]) ** 2
    if (d < bestD) {
      bestD = d
      best = i
    }
  })
  return best
}
