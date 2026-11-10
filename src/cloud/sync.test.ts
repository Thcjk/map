// @vitest-environment jsdom
import 'fake-indexeddb/auto'
import { describe, expect, it } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import { db, type Tour } from '../lib/db'
import { mergeDecision, rowToTour, syncAll, tourToRow, type TourRow } from './sync'

describe('mergeDecision', () => {
  it('übernimmt Cloud-Stand, wenn lokal nichts Neueres offen ist', () => {
    expect(mergeDecision(undefined, { client_updated_at: 5, deleted: false })).toBe('apply')
    expect(mergeDecision({ updatedAt: 9, dirty: 0 }, { client_updated_at: 5, deleted: false })).toBe('apply')
    expect(mergeDecision({ updatedAt: 3, dirty: 1 }, { client_updated_at: 5, deleted: true })).toBe('delete')
  })

  it('behält neuere lokale Änderungen', () => {
    expect(mergeDecision({ updatedAt: 9, dirty: 1 }, { client_updated_at: 5, deleted: true })).toBe('keep')
  })
})

const tour = (id: string, updatedAt: number, extra: Partial<Tour> = {}): Tour => ({
  id,
  name: id,
  createdAt: 1,
  updatedAt,
  plan: { kind: 'waypoints', waypoints: [] },
  points: [],
  ways: [],
  distance: 1,
  ascent: 2,
  descent: 3,
  duration: 4,
  dirty: 1,
  ...extra,
})

/** Minimaler In-Memory-Ersatz für die genutzten Supabase-Aufrufe. */
function fakeSupabase(remote: Record<string, TourRow[]>) {
  const upserts: Record<string, unknown[]> = { tours: [], collections: [] }
  const sb = {
    from(table: string) {
      return {
        select: () => ({
          gt: (_c: string, cursor: string) => ({
            order: () => ({
              limit: async () => ({ data: (remote[table] ?? []).filter((r) => r.server_updated_at > cursor), error: null }),
            }),
          }),
        }),
        upsert: async (rows: unknown[]) => {
          upserts[table].push(...rows)
          return { error: null }
        },
      }
    },
  }
  return { sb: sb as unknown as SupabaseClient, upserts }
}

describe('syncAll', () => {
  it('holt neue Touren, lädt lokale Änderungen hoch und bereinigt Löschungen', async () => {
    await db.tours.clear()
    await db.tours.bulkPut([tour('lokal', 10), tour('weg', 10, { deleted: true }), tour('alt', 1, { dirty: 0 })])
    const remoteRow = { ...tourToRow(tour('neu', 20)), server_updated_at: '2026-01-01T00:00:00Z' } as TourRow
    const remoteUpdate = { ...tourToRow(tour('alt', 30, { name: 'Neuer Name' })), server_updated_at: '2026-01-02T00:00:00Z' } as TourRow
    const { sb, upserts } = fakeSupabase({ tours: [remoteRow, remoteUpdate] })

    const r = await syncAll(sb, 'user-1')
    expect(r).toEqual({ pulled: 2, pushed: 2 })
    expect((await db.tours.get('neu'))?.dirty).toBe(0)
    expect((await db.tours.get('alt'))?.name).toBe('Neuer Name')
    expect((await db.tours.get('lokal'))?.dirty).toBe(0)
    expect(await db.tours.get('weg')).toBeUndefined()
    expect(upserts.tours.map((t) => (t as TourRow).id).sort()).toEqual(['lokal', 'weg'])
  })

  it('wandelt Zeilen verlustfrei um', () => {
    const t = tour('x', 7, { isPublic: true, dirty: 0, stages: null })
    expect(rowToTour({ ...tourToRow(t), server_updated_at: '' } as TourRow)).toEqual({ ...t, deleted: undefined } as Tour & { deleted: undefined })
  })
})
