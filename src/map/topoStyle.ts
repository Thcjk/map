import type { LayerSpecification, Map as MlMap, StyleSpecification } from 'maplibre-gl'
import { SOURCES } from '../data/sources'
import { OMT_PROTOCOL } from '../offline/store'
import { GREEN, INK, INK_MUTED, PAPER, PAPER_LIGHT, WATER, WATER_LINE } from '../theme'

/**
 * Eigener Kartenstil «Vermessungsblatt» auf den Vektordaten von OpenFreeMap
 * (OpenMapTiles-Schema): Papiergrund, Grünflächen in Stufen, Tinte für Wege und Schrift.
 * Relief und Höhenlinien kommen als Overlays dazu (siehe layers.ts).
 */
const FONT = ['Noto Sans Bold']
const FONT_REGULAR = ['Noto Sans Regular']
const FONT_ITALIC = ['Noto Sans Italic']

const label = (size: number | unknown[], extra: Record<string, unknown> = {}) => ({
  'text-font': FONT,
  'text-size': size,
  'text-transform': 'uppercase',
  'text-letter-spacing': 0.18,
  'text-max-width': 8,
  ...extra,
})
const halo = { 'text-color': INK, 'text-halo-color': PAPER_LIGHT, 'text-halo-width': 1.6 }

const layers = [
  { id: 'background', type: 'background', paint: { 'background-color': PAPER } },
  {
    id: 'landcover-grass',
    type: 'fill',
    source: 'omt',
    'source-layer': 'landcover',
    filter: ['in', ['get', 'class'], ['literal', ['grass', 'farmland', 'wetland']]],
    paint: { 'fill-color': GREEN[0], 'fill-opacity': 0.7 },
  },
  {
    id: 'landcover-wood',
    type: 'fill',
    source: 'omt',
    'source-layer': 'landcover',
    filter: ['==', ['get', 'class'], 'wood'],
    paint: { 'fill-color': GREEN[2], 'fill-opacity': ['interpolate', ['linear'], ['zoom'], 5, 0.75, 14, 0.55] },
  },
  {
    id: 'landcover-ice',
    type: 'fill',
    source: 'omt',
    'source-layer': 'landcover',
    filter: ['==', ['get', 'class'], 'ice'],
    paint: { 'fill-color': '#f7f7f1', 'fill-outline-color': WATER_LINE },
  },
  {
    id: 'landuse-residential',
    type: 'fill',
    source: 'omt',
    'source-layer': 'landuse',
    filter: ['in', ['get', 'class'], ['literal', ['residential', 'commercial', 'industrial']]],
    paint: { 'fill-color': '#d9d8c6', 'fill-opacity': 0.7 },
  },
  {
    id: 'park-outline',
    type: 'line',
    source: 'omt',
    'source-layer': 'park',
    paint: { 'line-color': GREEN[4], 'line-width': 1.2, 'line-dasharray': [4, 2], 'line-opacity': 0.7 },
  },
  { id: 'water', type: 'fill', source: 'omt', 'source-layer': 'water', paint: { 'fill-color': WATER } },
  {
    id: 'water-outline',
    type: 'line',
    source: 'omt',
    'source-layer': 'water',
    paint: { 'line-color': WATER_LINE, 'line-width': 0.8 },
  },
  {
    id: 'waterway',
    type: 'line',
    source: 'omt',
    'source-layer': 'waterway',
    paint: {
      'line-color': WATER_LINE,
      'line-width': ['interpolate', ['linear'], ['zoom'], 8, 0.5, 14, ['match', ['get', 'class'], 'river', 3, 1.2]],
    },
  },
  {
    id: 'building',
    type: 'fill',
    source: 'omt',
    'source-layer': 'building',
    minzoom: 13,
    paint: { 'fill-color': '#bfbfab', 'fill-outline-color': INK_MUTED },
  },
  {
    id: 'road-major-casing',
    type: 'line',
    source: 'omt',
    'source-layer': 'transportation',
    filter: ['in', ['get', 'class'], ['literal', ['motorway', 'trunk', 'primary', 'secondary']]],
    layout: { 'line-cap': 'round', 'line-join': 'round' },
    paint: { 'line-color': INK_MUTED, 'line-width': ['interpolate', ['linear'], ['zoom'], 6, 1, 12, 3.5, 16, 9] },
  },
  {
    id: 'road-major',
    type: 'line',
    source: 'omt',
    'source-layer': 'transportation',
    filter: ['in', ['get', 'class'], ['literal', ['motorway', 'trunk', 'primary', 'secondary']]],
    layout: { 'line-cap': 'round', 'line-join': 'round' },
    paint: { 'line-color': PAPER_LIGHT, 'line-width': ['interpolate', ['linear'], ['zoom'], 6, 0.3, 12, 2, 16, 7] },
  },
  {
    id: 'road-minor',
    type: 'line',
    source: 'omt',
    'source-layer': 'transportation',
    minzoom: 10,
    filter: ['in', ['get', 'class'], ['literal', ['tertiary', 'minor', 'service']]],
    layout: { 'line-cap': 'round', 'line-join': 'round' },
    paint: { 'line-color': INK_MUTED, 'line-width': ['interpolate', ['linear'], ['zoom'], 10, 0.5, 16, 3] },
  },
  {
    id: 'rail',
    type: 'line',
    source: 'omt',
    'source-layer': 'transportation',
    minzoom: 9,
    filter: ['==', ['get', 'class'], 'rail'],
    paint: { 'line-color': INK, 'line-width': 1, 'line-dasharray': [6, 2] },
  },
  {
    id: 'track',
    type: 'line',
    source: 'omt',
    'source-layer': 'transportation',
    minzoom: 11,
    filter: ['==', ['get', 'class'], 'track'],
    paint: { 'line-color': INK, 'line-width': 1, 'line-dasharray': [5, 2], 'line-opacity': 0.8 },
  },
  {
    id: 'path',
    type: 'line',
    source: 'omt',
    'source-layer': 'transportation',
    minzoom: 11,
    filter: ['==', ['get', 'class'], 'path'],
    paint: { 'line-color': INK, 'line-width': ['interpolate', ['linear'], ['zoom'], 11, 0.6, 16, 1.4], 'line-dasharray': [2, 1.5] },
  },
  {
    id: 'boundary-country',
    type: 'line',
    source: 'omt',
    'source-layer': 'boundary',
    filter: ['all', ['==', ['get', 'admin_level'], 2], ['!=', ['get', 'maritime'], 1]],
    paint: { 'line-color': INK, 'line-width': 1.2, 'line-dasharray': [6, 2, 1, 2], 'line-opacity': 0.75 },
  },
  {
    id: 'water-name',
    type: 'symbol',
    source: 'omt',
    'source-layer': 'water_name',
    layout: { 'text-field': ['get', 'name'], 'text-font': FONT_ITALIC, 'text-size': 12, 'text-letter-spacing': 0.1 },
    paint: { 'text-color': '#3f5f58', 'text-halo-color': PAPER_LIGHT, 'text-halo-width': 1.2 },
  },
  {
    id: 'peak',
    type: 'symbol',
    source: 'omt',
    'source-layer': 'mountain_peak',
    minzoom: 9,
    filter: ['<=', ['get', 'rank'], ['interpolate', ['linear'], ['zoom'], 9, 1, 13, 5]],
    layout: {
      'icon-image': 'peak',
      'icon-size': 0.5,
      'text-field': ['concat', ['get', 'name'], '\n', ['to-string', ['get', 'ele']]],
      'text-font': FONT_REGULAR,
      'text-size': 11,
      'text-anchor': 'top',
      'text-offset': [0, 0.6],
      'text-optional': true,
    },
    paint: halo,
  },
  {
    id: 'place-small',
    type: 'symbol',
    source: 'omt',
    'source-layer': 'place',
    minzoom: 10,
    filter: ['in', ['get', 'class'], ['literal', ['village', 'hamlet', 'suburb', 'isolated_dwelling']]],
    layout: { 'text-field': ['get', 'name'], ...label(10.5) },
    paint: { ...halo, 'text-color': INK_MUTED },
  },
  {
    id: 'place-town',
    type: 'symbol',
    source: 'omt',
    'source-layer': 'place',
    minzoom: 6,
    filter: ['==', ['get', 'class'], 'town'],
    layout: { 'text-field': ['get', 'name'], ...label(['interpolate', ['linear'], ['zoom'], 6, 10, 14, 14]) },
    paint: halo,
  },
  {
    id: 'place-city',
    type: 'symbol',
    source: 'omt',
    'source-layer': 'place',
    filter: ['==', ['get', 'class'], 'city'],
    layout: { 'text-field': ['get', 'name'], ...label(['interpolate', ['linear'], ['zoom'], 4, 10, 12, 18]) },
    paint: halo,
  },
  {
    id: 'place-country',
    type: 'symbol',
    source: 'omt',
    'source-layer': 'place',
    maxzoom: 7,
    filter: ['==', ['get', 'class'], 'country'],
    layout: { 'text-field': ['get', 'name'], ...label(13, { 'text-letter-spacing': 0.35 }) },
    paint: halo,
  },
] as unknown as LayerSpecification[]

export const TOPO_STYLE: StyleSpecification = {
  version: 8,
  name: 'Vermessungsblatt',
  glyphs: 'https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf',
  sources: {
    omt: {
      type: 'vector',
      // eigenes Protokoll: zuerst Offline-Cache, sonst Netz (siehe offline/store.ts)
      tiles: [`${OMT_PROTOCOL}://{z}/{x}/{y}`],
      minzoom: 0,
      maxzoom: 14,
      attribution: SOURCES.find((s) => s.id === 'openfreemap')!.attribution,
    },
  },
  layers,
}

/** Gipfel-Dreieck für den Stil bereitstellen (wird nach jedem Stilwechsel gebraucht). */
export function provideStyleImages(map: MlMap) {
  map.on('styleimagemissing', (e) => {
    if (e.id !== 'peak' || map.hasImage('peak')) return
    const size = 32
    const canvas = document.createElement('canvas')
    canvas.width = canvas.height = size
    const ctx = canvas.getContext('2d')!
    ctx.fillStyle = INK
    ctx.beginPath()
    ctx.moveTo(size / 2, 5)
    ctx.lineTo(size - 5, size - 6)
    ctx.lineTo(5, size - 6)
    ctx.closePath()
    ctx.fill()
    map.addImage('peak', ctx.getImageData(0, 0, size, size))
  })
}
