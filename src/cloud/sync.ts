import type { SupabaseClient } from '@supabase/supabase-js'
import { db, getSetting, setSetting, type Collection, type Tour } from '../lib/db'

/** Zeile der Cloud-Tabelle tours. */
export interface TourRow {
  id: string
  name: string
  data: Pick<Tour, 'plan' | 'points' | 'ways' | 'stages' | 'createdAt'>
  distance: number
  ascent: number
  descent: number
  duration: number
  is_public: boolean
  deleted: boolean
  client_updated_at: number
  server_updated_at: string
}

export interface CollectionRow {
  id: string
  name: string
  tour_ids: string[]
  deleted: boolean
  client_updated_at: number
  server_updated_at: string
}

export const tourToRow = (t: Tour): Omit<TourRow, 'server_updated_at'> => ({
  id: t.id,
  name: t.name,
  data: { plan: t.plan, points: t.points, ways: t.ways, stages: t.stages ?? null, createdAt: t.createdAt },
  distance: t.distance,
  ascent: t.ascent,
  descent: t.descent,
  duration: t.duration,
  is_public: t.isPublic ?? false,
  deleted: t.deleted ?? false,
  client_updated_at: t.updatedAt,
})

export const rowToTour = (r: TourRow): Tour => ({
  id: r.id,
  name: r.name,
  createdAt: r.data.createdAt ?? r.client_updated_at,
  updatedAt: r.client_updated_at,
  plan: r.data.plan,
  points: r.data.points,
  ways: r.data.ways,
  stages: r.data.stages ?? null,
  distance: r.distance,
  ascent: r.ascent,
  descent: r.descent,
  duration: r.duration,
  isPublic: r.is_public,
  dirty: 0,
})

const collectionToRow = (c: Collection): Omit<CollectionRow, 'server_updated_at'> => ({
  id: c.id,
  name: c.name,
  tour_ids: c.tourIds,
  deleted: c.deleted ?? false,
  client_updated_at: c.updatedAt,
})

const rowToCollection = (r: CollectionRow): Collection => ({
  id: r.id,
  name: r.name,
  tourIds: r.tour_ids,
  updatedAt: r.client_updated_at,
  dirty: 0,
})

/**
 * Entscheidet für eine Zeile aus der Cloud: übernehmen, löschen oder lokal behalten.
 * Regel «letzte Änderung gewinnt» – eine ungesendete lokale Änderung, die neuer ist, bleibt.
 */
export function mergeDecision(
  local: { updatedAt: number; dirty?: 0 | 1 } | undefined,
  remote: { client_updated_at: number; deleted: boolean },
): 'apply' | 'delete' | 'keep' {
  if (local?.dirty && local.updatedAt >= remote.client_updated_at) return 'keep'
  return remote.deleted ? 'delete' : 'apply'
}

async function pullTable<R extends { id: string; server_updated_at: string; client_updated_at: number; deleted: boolean }>(
  sb: SupabaseClient,
  table: 'tours' | 'collections',
  cursorKey: string,
  apply: (rows: R[]) => Promise<void>,
) {
  let cursor = await getSetting<string>(cursorKey, '1970-01-01T00:00:00Z')
  for (;;) {
    const { data, error } = await sb
      .from(table)
      .select('*')
      .gt('server_updated_at', cursor)
      .order('server_updated_at')
      .limit(200)
    if (error) throw error
    if (!data.length) break
    await apply(data as R[])
    cursor = (data[data.length - 1] as R).server_updated_at
    await setSetting(cursorKey, cursor)
    if (data.length < 200) break
  }
}

export interface SyncResult {
  pulled: number
  pushed: number
}

/** Abgleich: zuerst holen und zusammenführen, dann lokale Änderungen hochladen. */
export async function syncAll(sb: SupabaseClient, userId: string): Promise<SyncResult> {
  let pulled = 0
  let pushed = 0

  // Lokale Daten gehören nach einem Kontowechsel nicht automatisch zum neuen Konto.
  const owner = await getSetting<string | null>('sync.userId', null)
  if (owner !== userId) {
    await setSetting('sync.userId', userId)
    await setSetting(`sync.cursor.tours.${userId}`, '1970-01-01T00:00:00Z')
    await setSetting(`sync.cursor.collections.${userId}`, '1970-01-01T00:00:00Z')
  }

  await pullTable<TourRow>(sb, 'tours', `sync.cursor.tours.${userId}`, async (rows) => {
    await db.transaction('rw', db.tours, async () => {
      for (const r of rows) {
        const d = mergeDecision(await db.tours.get(r.id), r)
        if (d === 'apply') await db.tours.put(rowToTour(r))
        else if (d === 'delete') await db.tours.delete(r.id)
        if (d !== 'keep') pulled++
      }
    })
  })
  await pullTable<CollectionRow>(sb, 'collections', `sync.cursor.collections.${userId}`, async (rows) => {
    await db.transaction('rw', db.collections, async () => {
      for (const r of rows) {
        const d = mergeDecision(await db.collections.get(r.id), r)
        if (d === 'apply') await db.collections.put(rowToCollection(r))
        else if (d === 'delete') await db.collections.delete(r.id)
        if (d !== 'keep') pulled++
      }
    })
  })

  const dirtyTours = await db.tours.where('dirty').equals(1).toArray()
  for (let i = 0; i < dirtyTours.length; i += 20) {
    const batch = dirtyTours.slice(i, i + 20)
    const { error } = await sb.from('tours').upsert(batch.map(tourToRow))
    if (error) throw error
    await db.transaction('rw', db.tours, async () => {
      for (const t of batch) {
        const now = await db.tours.get(t.id)
        // Nur als abgeglichen markieren, wenn sich lokal inzwischen nichts geändert hat.
        if (now && now.updatedAt === t.updatedAt) {
          if (now.deleted) await db.tours.delete(t.id)
          else await db.tours.update(t.id, { dirty: 0 })
        }
      }
    })
    pushed += batch.length
  }

  const dirtyCollections = await db.collections.where('dirty').equals(1).toArray()
  if (dirtyCollections.length) {
    const { error } = await sb.from('collections').upsert(dirtyCollections.map(collectionToRow))
    if (error) throw error
    for (const c of dirtyCollections) {
      const now = await db.collections.get(c.id)
      if (now && now.updatedAt === c.updatedAt) {
        if (now.deleted) await db.collections.delete(c.id)
        else await db.collections.update(c.id, { dirty: 0 })
      }
    }
    pushed += dirtyCollections.length
  }

  await setSetting('sync.lastAt', Date.now())
  return { pulled, pushed }
}

/** Öffentlich geteilte Tour abrufen (auch ohne Konto). */
export async function fetchPublicTour(sb: SupabaseClient, id: string) {
  const { data, error } = await sb.rpc('get_public_tour', { tour_id: id })
  if (error) throw error
  const row = (data as Omit<TourRow, 'is_public' | 'deleted' | 'client_updated_at' | 'server_updated_at'>[])[0]
  return row ?? null
}
