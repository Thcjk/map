import type { LayerSpecification, Map as MlMap, StyleSpecification } from 'maplibre-gl'
import { SOURCES } from '../data/sources'
import { OMT_PROTOCOL } from '../offline/store'
import { GREEN, INK, INK_MUTED, MARK, PAPER, PAPER_LIGHT, TRAIL, WATER, WATER_LINE } from '../theme'

/**
 * Eigener Kartenstil «Vermessungsblatt» auf den Vektordaten von OpenFreeMap
 * (OpenMapTiles-Schema): Papiergrund, Grünflächen in Stufen, Tinte für Wege und Schrift.
 * Relief und Höhenlinien kommen als Overlays dazu (siehe layers.ts).
 */
/** Eigene Glyphen (IBM Plex Mono, OFL) aus public/fonts – technische Kartenbeschriftung. */
export const MAP_FONT = ['PlexMono-Medium']
export const MAP_FONT_REGULAR = ['PlexMono-Regular']
const MAP_FONT_ITALIC = ['PlexMono-Italic']
const GLYPHS = `${location.origin}${import.meta.env.BASE_URL}fonts/{fontstack}/{range}.pbf`

/** Deutsche Namen bevorzugen, sonst lateinische Schreibweise (die Schrift deckt Latein und Kyrillisch ab). */
const NAME = ['coalesce', ['get', 'name:de'], ['get', 'name:latin'], ['get', 'name']]

const label = (size: number | unknown[], extra: Record<string, unknown> = {}) => ({
  'text-field': NAME,
  'text-font': MAP_FONT,
  'text-size': size,
  'text-transform': 'uppercase',
  'text-letter-spacing': 0.16,
  'text-max-width': 9,
  'text-line-height': 1.25,
  ...extra,
})
const halo = { 'text-color': INK, 'text-halo-color': PAPER_LIGHT, 'text-halo-width': 1.4 }

const HIKING_POIS = ['alpine_hut', 'wilderness_hut', 'shelter', 'camp_site', 'drinking_water', 'viewpoint']

const layers = [
  { id: 'background', type: 'background', paint: { 'background-color': PAPER } },
  {
    id: 'landcover-grass',
    type: 'fill',
    source: 'omt',
    'source-layer': 'landcover',
    filter: ['in', ['get', 'class'], ['literal', ['grass', 'farmland', 'wetland']]],
    paint: { 'fill-color': GREEN[0], 'fill-opacity': 0.55 },
  },
  {
    id: 'landcover-wood',
    type: 'fill',
    source: 'omt',
    'source-layer': 'landcover',
    filter: ['==', ['get', 'class'], 'wood'],
    paint: { 'fill-color': GREEN[2], 'fill-opacity': ['interpolate', ['linear'], ['zoom'], 5, 0.6, 12, 0.38] },
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
    paint: { 'line-color': INK_MUTED, 'line-width': 1, 'line-dasharray': [6, 2], 'line-opacity': 0.9 },
  },
  {
    id: 'path',
    type: 'line',
    source: 'omt',
    'source-layer': 'transportation',
    minzoom: 11,
    filter: ['==', ['get', 'class'], 'path'],
    paint: { 'line-color': TRAIL, 'line-width': ['interpolate', ['linear'], ['zoom'], 11, 0.7, 16, 1.6], 'line-dasharray': [3, 2] },
  },
  {
    id: 'aerialway',
    type: 'line',
    source: 'omt',
    'source-layer': 'transportation',
    minzoom: 11,
    filter: ['==', ['get', 'class'], 'aerialway'],
    paint: { 'line-color': INK, 'line-width': 1, 'line-dasharray': [1, 3] },
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
    layout: { 'text-field': NAME, 'text-font': MAP_FONT_ITALIC, 'text-size': 11, 'text-letter-spacing': 0.12 },
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
      'text-field': ['format', NAME, {}, '\n', {}, ['to-string', ['get', 'ele']], { 'font-scale': 0.95 }],
      'text-font': MAP_FONT_REGULAR,
      'text-size': 10.5,
      'text-transform': 'uppercase',
      'text-letter-spacing': 0.1,
      'text-anchor': 'top',
      'text-offset': [0, 0.6],
      'text-optional': true,
    },
    paint: halo,
  },
  {
    // Was unterwegs zählt: Hütten, Unterstände, Zeltplätze, Trinkwasser, Aussichtspunkte
    id: 'hiking-poi',
    type: 'symbol',
    source: 'omt',
    'source-layer': 'poi',
    minzoom: 12,
    filter: ['in', ['get', 'subclass'], ['literal', HIKING_POIS]],
    layout: {
      'icon-image': ['concat', 'poi-', ['get', 'subclass']],
      'icon-size': 0.5,
      'icon-allow-overlap': false,
      'text-field': ['step', ['zoom'], '', 13, NAME],
      'text-font': MAP_FONT_REGULAR,
      'text-size': 10,
      'text-anchor': 'top',
      'text-offset': [0, 0.9],
      'text-max-width': 8,
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
    layout: label(10),
    paint: { ...halo, 'text-color': INK_MUTED },
  },
  {
    id: 'place-town',
    type: 'symbol',
    source: 'omt',
    'source-layer': 'place',
    minzoom: 8,
    filter: ['==', ['get', 'class'], 'town'],
    layout: label(['interpolate', ['linear'], ['zoom'], 6, 10, 14, 13]),
    paint: halo,
  },
  {
    id: 'place-city',
    type: 'symbol',
    source: 'omt',
    'source-layer': 'place',
    filter: ['all', ['==', ['get', 'class'], 'city'], ['<=', ['coalesce', ['get', 'rank'], 9], ['step', ['zoom'], 2, 5, 4, 6, 6, 7, 99]]],
    layout: label(['interpolate', ['linear'], ['zoom'], 4, 10, 12, 16], { 'text-letter-spacing': 0.22 }),
    paint: halo,
  },
  {
    id: 'place-country',
    type: 'symbol',
    source: 'omt',
    'source-layer': 'place',
    maxzoom: 7,
    // Kleinstaaten erst beim Hineinzoomen beschriften, sonst überdecken sie ihre Umgebung
    filter: ['all', ['==', ['get', 'class'], 'country'], ['<=', ['coalesce', ['get', 'rank'], 6], ['step', ['zoom'], 1, 3, 2, 4, 3, 5, 4, 6, 6]]],
    layout: label(12, { 'text-letter-spacing': 0.4 }),
    paint: halo,
  },
] as unknown as LayerSpecification[]

export const TOPO_STYLE: StyleSpecification = {
  version: 8,
  name: 'Vermessungsblatt',
  glyphs: GLYPHS,
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

type Draw = (ctx: CanvasRenderingContext2D, s: number) => void

/** Kleine Kartenzeichen in Tinte (bzw. Rot für Hütten), gezeichnet statt geladen. */
const SYMBOLS: Record<string, { color: string; draw: Draw }> = {
  peak: {
    color: INK,
    draw: (c, s) => {
      c.moveTo(s / 2, s * 0.16)
      c.lineTo(s * 0.86, s * 0.82)
      c.lineTo(s * 0.14, s * 0.82)
      c.closePath()
    },
  },
  'poi-alpine_hut': { color: MARK, draw: house },
  'poi-wilderness_hut': { color: INK, draw: house },
  'poi-shelter': {
    color: INK,
    draw: (c, s) => {
      c.moveTo(s * 0.12, s * 0.55)
      c.lineTo(s / 2, s * 0.2)
      c.lineTo(s * 0.88, s * 0.55)
      c.lineTo(s * 0.76, s * 0.55)
      c.lineTo(s / 2, s * 0.34)
      c.lineTo(s * 0.24, s * 0.55)
      c.closePath()
      c.rect(s * 0.24, s * 0.55, s * 0.08, s * 0.28)
      c.rect(s * 0.68, s * 0.55, s * 0.08, s * 0.28)
    },
  },
  'poi-camp_site': {
    color: INK,
    draw: (c, s) => {
      c.moveTo(s / 2, s * 0.18)
      c.lineTo(s * 0.9, s * 0.82)
      c.lineTo(s * 0.6, s * 0.82)
      c.lineTo(s / 2, s * 0.56)
      c.lineTo(s * 0.4, s * 0.82)
      c.lineTo(s * 0.1, s * 0.82)
      c.closePath()
    },
  },
  'poi-drinking_water': {
    color: WATER_LINE,
    draw: (c, s) => {
      c.moveTo(s / 2, s * 0.14)
      c.bezierCurveTo(s * 0.86, s * 0.5, s * 0.8, s * 0.86, s / 2, s * 0.86)
      c.bezierCurveTo(s * 0.2, s * 0.86, s * 0.14, s * 0.5, s / 2, s * 0.14)
    },
  },
  'poi-viewpoint': {
    color: INK,
    draw: (c, s) => {
      c.arc(s / 2, s * 0.7, s * 0.36, Math.PI, 0)
      c.closePath()
      c.rect(s * 0.46, s * 0.14, s * 0.08, s * 0.16)
    },
  },
}

function house(c: CanvasRenderingContext2D, s: number) {
  c.moveTo(s / 2, s * 0.14)
  c.lineTo(s * 0.9, s * 0.5)
  c.lineTo(s * 0.78, s * 0.5)
  c.lineTo(s * 0.78, s * 0.84)
  c.lineTo(s * 0.22, s * 0.84)
  c.lineTo(s * 0.22, s * 0.5)
  c.lineTo(s * 0.1, s * 0.5)
  c.closePath()
}

/** Kartenzeichen bei Bedarf bereitstellen (auch nach jedem Stilwechsel). */
export function provideStyleImages(map: MlMap) {
  map.on('styleimagemissing', (e) => {
    const symbol = SYMBOLS[e.id]
    if (!symbol || map.hasImage(e.id)) return
    const size = 36
    const canvas = document.createElement('canvas')
    canvas.width = canvas.height = size
    const ctx = canvas.getContext('2d')!
    ctx.beginPath()
    symbol.draw(ctx, size)
    // heller Rand, damit das Zeichen auf grünem Grund lesbar bleibt
    ctx.lineJoin = 'round'
    ctx.lineWidth = 4
    ctx.strokeStyle = PAPER_LIGHT
    ctx.stroke()
    ctx.fillStyle = symbol.color
    ctx.fill()
    map.addImage(e.id, ctx.getImageData(0, 0, size, size))
  })
}
