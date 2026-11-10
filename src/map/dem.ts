import * as maplibregl from 'maplibre-gl'
import mlcontour from 'maplibre-contour'

/**
 * Höhenmodell (Terrain Tiles, Terrarium-Kodierung). Eine gemeinsame Quelle für Relief und
 * Höhenlinien: Tiles werden nur einmal geladen; die Linien berechnet ein Web Worker.
 */
export const demSource = new mlcontour.DemSource({
  url: 'https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png',
  encoding: 'terrarium',
  maxzoom: 13,
  worker: true,
  cacheSize: 100,
  timeoutMs: 10_000,
})
demSource.setupMaplibre(maplibregl)

/** Höhenlinien als Vektortiles; Abstände [fein, betont] in Metern je Zoomstufe. */
export const contourTiles = demSource.contourProtocolUrl({
  thresholds: {
    9: [200, 1000],
    11: [100, 500],
    12: [50, 200],
    14: [20, 100],
    15: [10, 50],
  },
  contourLayer: 'contours',
  elevationKey: 'ele',
  levelKey: 'level',
})
