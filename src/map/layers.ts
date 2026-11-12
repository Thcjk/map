import type { Map as MlMap, LayerSpecification, SourceSpecification, StyleSpecification } from 'maplibre-gl'
import { SOURCES } from '../data/sources'
import { CONTOUR, GREEN, INK, PAPER_LIGHT } from '../theme'
import { contourTiles, demSource } from './dem'
import { CH_BOUNDS } from './switzerland'
import { MAP_FONT_REGULAR, TOPO_STYLE } from './topoStyle'

const attribution = (id: string) => SOURCES.find((s) => s.id === id)!.attribution

export type BaseMapId = 'openfreemap' | 'swisstopo-color' | 'swisstopo-hiking' | 'swisstopo-vector'
export type OverlayId = 'trails' | 'hillshade' | 'contours'

export interface BaseMap {
  id: BaseMapId
  label: string
  description: string
  swiss: boolean
  /** Vektorstil, der als Grundlage geladen wird (eigener Stil oder URL). */
  style: StyleSpecification | string
  /** Rasterebenen, die über den Vektorstil gelegt werden (nur innerhalb der Schweiz). */
  rasterLayers?: { id: string; url: string }[]
}

const swisstopoWmts = (layer: string, ext: 'jpeg' | 'png') =>
  `https://wmts.geo.admin.ch/1.0.0/${layer}/default/current/3857/{z}/{x}/{y}.${ext}`

export const BASE_MAPS: BaseMap[] = [
  {
    id: 'openfreemap',
    label: 'Topo',
    description: 'Eigener Stil, weltweit (OpenFreeMap)',
    swiss: false,
    style: TOPO_STYLE,
  },
  {
    id: 'swisstopo-hiking',
    label: 'Wanderkarte CH',
    description: 'Landeskarte mit Wanderwegen, swisstopo',
    swiss: true,
    style: TOPO_STYLE,
    rasterLayers: [
      { id: 'pixelkarte', url: swisstopoWmts('ch.swisstopo.pixelkarte-farbe', 'jpeg') },
      { id: 'wanderwege', url: swisstopoWmts('ch.swisstopo.swisstlm3d-wanderwege', 'png') },
    ],
  },
  {
    id: 'swisstopo-color',
    label: 'Landeskarte CH',
    description: 'Landeskarte farbig, swisstopo',
    swiss: true,
    style: TOPO_STYLE,
    rasterLayers: [{ id: 'pixelkarte', url: swisstopoWmts('ch.swisstopo.pixelkarte-farbe', 'jpeg') }],
  },
  {
    id: 'swisstopo-vector',
    label: 'Vektorkarte CH',
    description: 'swisstopo Basiskarte (Vektor)',
    swiss: true,
    style: 'https://vectortiles.geo.admin.ch/styles/ch.swisstopo.basemap.vt/style.json',
  },
]

export const OVERLAYS: { id: OverlayId; label: string }[] = [
  { id: 'trails', label: 'Markierte Wanderrouten (farbig nach Netz)' },
  { id: 'hillshade', label: 'Relief' },
  { id: 'contours', label: 'Höhenlinien' },
]

/** Präfix für Ebenen, die die App selbst verwaltet. Basis-Overlays liegen darunter. */
export const APP_LAYER_PREFIX = 'app-'
const BASE_PREFIX = 'base-'

function firstLayerId(map: MlMap, test: (l: LayerSpecification) => boolean): string | undefined {
  return map.getStyle().layers.find(test)?.id
}

function addRaster(
  map: MlMap,
  id: string,
  source: SourceSpecification,
  layer: Partial<LayerSpecification>,
  beforeId?: string,
) {
  if (!map.getSource(id)) map.addSource(id, source)
  if (!map.getLayer(id)) map.addLayer({ id, source: id, ...layer } as LayerSpecification, beforeId)
}

/**
 * Bringt die Rasterebenen des Grundkarten-Stils und die Overlays in den gewünschten Zustand.
 * Wird nach jedem Stilwechsel und bei jeder Änderung der Auswahl aufgerufen (idempotent).
 */
export function syncLayers(map: MlMap, base: BaseMap, overlays: Record<OverlayId, boolean>) {
  const wanted = new Set<string>()
  const trailsId = `${BASE_PREFIX}trails`
  const beforeApp = () => firstLayerId(map, (l) => l.id.startsWith(APP_LAYER_PREFIX))

  const firstSymbol = () => firstLayerId(map, (l) => l.type === 'symbol') ?? beforeApp()

  if (overlays.hillshade) {
    const id = `${BASE_PREFIX}hillshade`
    wanted.add(id)
    addRaster(
      map,
      id,
      {
        type: 'raster-dem',
        tiles: [demSource.sharedDemProtocolUrl],
        encoding: 'terrarium',
        tileSize: 256,
        maxzoom: 13,
        attribution: attribution('terrarium'),
      },
      {
        type: 'hillshade',
        // Licht aus vier Richtungen: Jeder Hang wird grün, je steiler desto dunkler;
        // flaches Gelände bleibt papierhell (wie eine Hangneigungskarte).
        paint: {
          'hillshade-method': 'multidirectional',
          'hillshade-illumination-direction': [315, 45, 135, 225],
          'hillshade-illumination-altitude': [38, 38, 38, 38],
          'hillshade-shadow-color': [GREEN[5], GREEN[4], GREEN[4], GREEN[5]],
          'hillshade-highlight-color': ['rgba(243,242,231,0)', 'rgba(243,242,231,0)', 'rgba(243,242,231,0)', 'rgba(243,242,231,0)'],
          'hillshade-exaggeration': 0.66,
        } as never,
      },
      // unter Gewässern und Wegen, damit diese lesbar bleiben
      map.getLayer('water') ? 'water' : firstSymbol(),
    )
  }

  if (overlays.contours) {
    const src = `${BASE_PREFIX}contours`
    const labels = `${BASE_PREFIX}contour-labels`
    wanted.add(src).add(labels)
    if (!map.getSource(src))
      map.addSource(src, { type: 'vector', tiles: [contourTiles], maxzoom: 15, attribution: attribution('terrarium') })
    if (!map.getLayer(src))
      map.addLayer(
        {
          id: src,
          type: 'line',
          source: src,
          'source-layer': 'contours',
          paint: {
            'line-color': CONTOUR,
            'line-opacity': ['match', ['get', 'level'], 1, 0.85, 0.5],
            'line-width': ['match', ['get', 'level'], 1, 1.1, 0.55],
          },
        },
        map.getLayer('building') ? 'building' : firstSymbol(),
      )
    // Beschriftung nur im eigenen Stil (dort ist die Schrift sicher vorhanden)
    if (!map.getLayer(labels) && map.getLayer('peak'))
      map.addLayer(
        {
          id: labels,
          type: 'symbol',
          source: src,
          'source-layer': 'contours',
          filter: ['>', ['get', 'level'], 0],
          layout: {
            'symbol-placement': 'line',
            'text-field': ['to-string', ['get', 'ele']],
            'text-font': MAP_FONT_REGULAR,
            'text-size': 9.5,
            'text-letter-spacing': 0.06,
          },
          paint: { 'text-color': INK, 'text-halo-color': PAPER_LIGHT, 'text-halo-width': 1.2 },
        },
        firstSymbol(),
      )
  }

  for (const r of base.rasterLayers ?? []) {
    const id = `${BASE_PREFIX}${r.id}`
    wanted.add(id)
    addRaster(
      map,
      id,
      {
        type: 'raster',
        tiles: [r.url],
        tileSize: 256,
        bounds: CH_BOUNDS,
        minzoom: 6,
        maxzoom: 18,
        attribution: attribution('swisstopo'),
      },
      { type: 'raster' },
      map.getLayer(trailsId) ? trailsId : beforeApp(),
    )
  }

  if (overlays.trails) {
    wanted.add(trailsId)
    addRaster(
      map,
      trailsId,
      {
        type: 'raster',
        tiles: ['https://tile.waymarkedtrails.org/hiking/{z}/{x}/{y}.png'],
        tileSize: 256,
        maxzoom: 18,
        attribution: attribution('waymarkedtrails'),
      },
      { type: 'raster', paint: { 'raster-opacity': ['interpolate', ['linear'], ['zoom'], 6, 0.95, 14, 0.75] } as never },
      beforeApp(),
    )
  }

  // Nicht mehr gewünschte Ebenen entfernen, danach deren Quellen.
  for (const layer of map.getStyle().layers) {
    if (layer.id.startsWith(BASE_PREFIX) && !wanted.has(layer.id)) {
      map.removeLayer(layer.id)
    }
  }
  for (const id of Object.keys(map.getStyle().sources)) {
    if (id.startsWith(BASE_PREFIX) && !wanted.has(id)) map.removeSource(id)
  }
}
