import type { Map as MlMap, LayerSpecification, SourceSpecification } from 'maplibre-gl'
import { SOURCES } from '../data/sources'
import { CH_BOUNDS } from './switzerland'

const attribution = (id: string) => SOURCES.find((s) => s.id === id)!.attribution

export type BaseMapId = 'openfreemap' | 'swisstopo-color' | 'swisstopo-hiking' | 'swisstopo-vector'
export type OverlayId = 'trails' | 'hillshade'

export interface BaseMap {
  id: BaseMapId
  label: string
  description: string
  swiss: boolean
  /** Vektorstil, der als Grundlage geladen wird. */
  styleUrl: string
  /** Rasterebenen, die über den Vektorstil gelegt werden (nur innerhalb der Schweiz). */
  rasterLayers?: { id: string; url: string }[]
}

const OPENFREEMAP_STYLE = 'https://tiles.openfreemap.org/styles/liberty'
const swisstopoWmts = (layer: string, ext: 'jpeg' | 'png') =>
  `https://wmts.geo.admin.ch/1.0.0/${layer}/default/current/3857/{z}/{x}/{y}.${ext}`

export const BASE_MAPS: BaseMap[] = [
  {
    id: 'openfreemap',
    label: 'Standard',
    description: 'OpenFreeMap, weltweit',
    swiss: false,
    styleUrl: OPENFREEMAP_STYLE,
  },
  {
    id: 'swisstopo-hiking',
    label: 'Wanderkarte CH',
    description: 'Landeskarte mit Wanderwegen, swisstopo',
    swiss: true,
    styleUrl: OPENFREEMAP_STYLE,
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
    styleUrl: OPENFREEMAP_STYLE,
    rasterLayers: [{ id: 'pixelkarte', url: swisstopoWmts('ch.swisstopo.pixelkarte-farbe', 'jpeg') }],
  },
  {
    id: 'swisstopo-vector',
    label: 'Vektorkarte CH',
    description: 'swisstopo Basiskarte (Vektor)',
    swiss: true,
    styleUrl: 'https://vectortiles.geo.admin.ch/styles/ch.swisstopo.basemap.vt/style.json',
  },
]

export const OVERLAYS: { id: OverlayId; label: string }[] = [
  { id: 'trails', label: 'Markierte Wanderwege' },
  { id: 'hillshade', label: 'Relief' },
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

  if (overlays.hillshade) {
    const id = `${BASE_PREFIX}hillshade`
    wanted.add(id)
    addRaster(
      map,
      id,
      {
        type: 'raster-dem',
        tiles: ['https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png'],
        encoding: 'terrarium',
        tileSize: 256,
        maxzoom: 15,
        attribution: attribution('terrarium'),
      },
      {
        type: 'hillshade',
        paint: { 'hillshade-exaggeration': 0.35, 'hillshade-shadow-color': '#3a4650' },
      },
      firstLayerId(map, (l) => l.type === 'symbol') ?? beforeApp(),
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
      { type: 'raster', paint: { 'raster-opacity': 0.85 } },
      beforeApp(),
    )
  }

  // Nicht mehr gewünschte Ebenen entfernen.
  for (const layer of map.getStyle().layers) {
    if (layer.id.startsWith(BASE_PREFIX) && !wanted.has(layer.id)) {
      map.removeLayer(layer.id)
      if (map.getSource(layer.id)) map.removeSource(layer.id)
    }
  }
}
