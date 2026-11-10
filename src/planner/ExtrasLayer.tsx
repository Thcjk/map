import { useCallback, useEffect, useRef } from 'react'
import * as maplibregl from 'maplibre-gl'
import type { ExpressionSpecification, GeoJSONSource, Map as MlMap, MapLayerMouseEvent } from 'maplibre-gl'
import type { FeatureCollection } from 'geojson'
import { useMap } from '../map/MapContext'
import { useAppLayers } from '../map/useAppLayers'
import { nearestIndex } from '../lib/geo'
import type { Route } from '../routing/route'
import { kindLabel, POI_CATEGORIES, type Poi, type PoiCategory } from '../trails/pois'

interface Props {
  route: Route | null
  cuts: number[]
  onMoveCut: (i: number, index: number) => void
  pois: Poi[] | null
  filter: Set<PoiCategory>
}

const POIS = 'app-pois'

const poiGeoJson = (pois: Poi[] | null): FeatureCollection => ({
  type: 'FeatureCollection',
  features: (pois ?? []).map((p) => ({
    type: 'Feature',
    properties: { id: p.id, category: p.category, name: p.name, kind: kindLabel(p.kind) },
    geometry: { type: 'Point', coordinates: [p.lng, p.lat] },
  })),
})

/** Etappenenden (verschiebbar) und POIs auf der Karte. */
export default function ExtrasLayer({ route, cuts, onMoveCut, pois, filter }: Props) {
  const map = useMap()
  const latest = useRef({ route, onMoveCut, pois })
  latest.current = { route, onMoveCut, pois }

  const setup = useCallback((m: MlMap) => {
    if (!m.getSource(POIS)) m.addSource(POIS, { type: 'geojson', data: poiGeoJson(latest.current.pois) })
    if (!m.getLayer(POIS))
      m.addLayer(
        {
          id: POIS,
          type: 'circle',
          source: POIS,
          paint: {
            'circle-radius': ['interpolate', ['linear'], ['zoom'], 8, 4, 14, 8],
            'circle-color': [
              'match',
              ['get', 'category'],
              ...POI_CATEGORIES.flatMap((c) => [c.id, c.color]),
              '#888',
            ] as unknown as ExpressionSpecification,
            'circle-stroke-color': '#fff',
            'circle-stroke-width': 2,
          },
        },
        // unter der Route einordnen, damit Klicks auf die Linie Vorrang haben
        m.getLayer('app-route-casing') ? 'app-route-casing' : undefined,
      )
  }, [])
  useAppLayers(map, setup)

  useEffect(() => {
    ;(map?.getSource(POIS) as GeoJSONSource | undefined)?.setData(poiGeoJson(pois))
  }, [map, pois])

  useEffect(() => {
    if (map?.getLayer(POIS)) map.setFilter(POIS, ['in', ['get', 'category'], ['literal', [...filter]]])
  }, [map, filter, pois])

  useEffect(() => {
    if (!map) return
    const onClick = (e: MapLayerMouseEvent) => {
      const f = e.features?.[0]
      if (!f) return
      e.preventDefault()
      new maplibregl.Popup({ closeButton: true, className: 'poi-popup' })
        .setLngLat(e.lngLat)
        .setHTML(`<strong>${escapeHtml(String(f.properties.name))}</strong><br>${escapeHtml(String(f.properties.kind))}`)
        .addTo(map)
    }
    map.on('click', POIS, onClick)
    return () => {
      map.off('click', POIS, onClick)
    }
  }, [map])

  // Etappenend-Marker
  useEffect(() => {
    if (!map || !route) return
    const markers = cuts.map((idx, i) => {
      const el = document.createElement('div')
      el.className = 'stage-marker'
      el.textContent = String(i + 1)
      el.setAttribute('aria-label', `Ende Tag ${i + 1}`)
      const p = route.points[idx]
      const marker = new maplibregl.Marker({ element: el, draggable: true }).setLngLat([p[0], p[1]]).addTo(map)
      marker.on('dragend', () => {
        const r = latest.current.route
        if (!r) return
        const ll = marker.getLngLat()
        latest.current.onMoveCut(i, nearestIndex(r.points, [ll.lng, ll.lat]))
      })
      return marker
    })
    return () => markers.forEach((m) => m.remove())
  }, [map, route, cuts])

  return null
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!)
}
