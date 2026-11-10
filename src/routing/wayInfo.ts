/** Wegbeschaffenheit und Schwierigkeit aus OSM-Tags ableiten. */

export type SurfaceClass = 'paved' | 'gravel' | 'natural' | 'path' | 'rock' | 'unknown'
export type SacGrade = 'T1' | 'T2' | 'T3' | 'T4' | 'T5' | 'T6'

export const SURFACE_LABELS: Record<SurfaceClass, string> = {
  paved: 'Asphalt/Beton',
  gravel: 'Schotter',
  natural: 'Naturbelag',
  path: 'Pfad',
  rock: 'Fels/Geröll',
  unknown: 'Unbekannt',
}

export const SURFACE_COLORS: Record<SurfaceClass, string> = {
  paved: '#8d9187',
  gravel: '#bdb184',
  natural: '#9db389',
  path: '#2c4a31',
  rock: '#55634f',
  unknown: '#d5d9c6',
}

export const SAC_LABELS: Record<SacGrade, string> = {
  T1: 'T1 Wandern',
  T2: 'T2 Bergwandern',
  T3: 'T3 anspruchsvolles Bergwandern',
  T4: 'T4 Alpinwandern',
  T5: 'T5 anspruchsvolles Alpinwandern',
  T6: 'T6 schwieriges Alpinwandern',
}

const SAC_FROM_OSM: Record<string, SacGrade> = {
  hiking: 'T1',
  mountain_hiking: 'T2',
  demanding_mountain_hiking: 'T3',
  alpine_hiking: 'T4',
  demanding_alpine_hiking: 'T5',
  difficult_alpine_hiking: 'T6',
}

const SURFACE_FROM_OSM: Record<string, SurfaceClass> = {
  asphalt: 'paved',
  paved: 'paved',
  concrete: 'paved',
  'concrete:plates': 'paved',
  paving_stones: 'paved',
  sett: 'paved',
  cobblestone: 'paved',
  compacted: 'gravel',
  fine_gravel: 'gravel',
  gravel: 'gravel',
  pebblestone: 'gravel',
  unpaved: 'natural',
  dirt: 'natural',
  earth: 'natural',
  ground: 'natural',
  grass: 'natural',
  mud: 'natural',
  sand: 'natural',
  wood: 'natural',
  woodchips: 'natural',
  rock: 'rock',
  stone: 'rock',
  scree: 'rock',
}

/** Zerlegt «highway=path surface=ground» in ein Objekt. */
export function parseTags(s: string): Record<string, string> {
  const out: Record<string, string> = {}
  for (const part of s.trim().split(/\s+/)) {
    const i = part.indexOf('=')
    if (i > 0) out[part.slice(0, i)] = part.slice(i + 1)
  }
  return out
}

export function classifySurface(tags: Record<string, string>): SurfaceClass {
  const s = tags.surface && SURFACE_FROM_OSM[tags.surface]
  if (s) return s
  switch (tags.highway) {
    case 'path':
    case 'footway':
    case 'bridleway':
      return 'path'
    case 'track':
      return tags.tracktype === 'grade1' ? 'paved' : 'gravel'
    case 'residential':
    case 'unclassified':
    case 'tertiary':
    case 'secondary':
    case 'primary':
    case 'service':
    case 'living_street':
    case 'cycleway':
      return 'paved'
    default:
      return 'unknown'
  }
}

export function classifySac(tags: Record<string, string>): SacGrade | null {
  return SAC_FROM_OSM[tags.sac_scale] ?? null
}

export const SAC_ORDER: SacGrade[] = ['T1', 'T2', 'T3', 'T4', 'T5', 'T6']
