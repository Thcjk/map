import Dexie, { type EntityTable } from 'dexie'
import type { Plan } from '../planner/plannerState'
import type { RoutePoint } from './geo'
import type { WaySegment } from '../routing/types'

/** Einfache Schlüssel-Wert-Einstellungen (z. B. letzte Kartenansicht, gewählter Layer). */
export interface Setting {
  key: string
  value: unknown
}

/** Gespeicherte, geplante Tour. Die Geometrie wird mitgespeichert, damit sie offline bleibt. */
export interface Tour {
  id: string
  name: string
  createdAt: number
  updatedAt: number
  plan: Plan
  points: RoutePoint[]
  ways: WaySegment[]
  distance: number
  ascent: number
  descent: number
  duration: number
  stages?: import('../planner/stages').StagePlan | null
}

/** Aus OSM geladener Fernweg (Relation), samt ergänzten Höhen. */
export interface Trail {
  id: number
  name: string
  ref?: string
  network?: string
  points: RoutePoint[]
  gaps: number
  fetchedAt: number
}

/** Zwischengespeicherte POIs entlang einer Route (Schlüssel = Geometrie-Hash + Korridor). */
export interface PoiCache {
  key: string
  pois: import('../trails/pois').Poi[]
  fetchedAt: number
}

export const db = new Dexie('wanderapp') as Dexie & {
  settings: EntityTable<Setting, 'key'>
  tours: EntityTable<Tour, 'id'>
  trails: EntityTable<Trail, 'id'>
  pois: EntityTable<PoiCache, 'key'>
}

db.version(1).stores({
  settings: 'key',
})
db.version(2).stores({
  tours: 'id, updatedAt',
})
db.version(3).stores({
  trails: 'id',
  pois: 'key',
})

export async function getSetting<T>(key: string, fallback: T): Promise<T> {
  const row = await db.settings.get(key)
  return row === undefined ? fallback : (row.value as T)
}

export async function setSetting<T>(key: string, value: T): Promise<void> {
  await db.settings.put({ key, value })
}
