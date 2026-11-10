import 'fake-indexeddb/auto'
import { describe, expect, it } from 'vitest'
import { buildRoute } from '../routing/route'
import { deleteTour, getTour, listTours, saveTour } from './tours'

const route = buildRoute([
  { points: [[7, 46, 500], [7.01, 46, 600]], ways: [{ from: 0, to: 1, surface: 'path', sac: 'T1' }], routed: true },
])
const plan = { kind: 'waypoints' as const, waypoints: [[7, 46], [7.01, 46]] as [number, number][] }

describe('tours', () => {
  it('speichert, aktualisiert und löscht Touren', async () => {
    const id = await saveTour('  Test  ', plan, route)
    const t = await getTour(id)
    expect(t?.name).toBe('Test')
    expect(t?.ascent).toBe(100)
    await saveTour('Neu', plan, route, id)
    expect((await listTours()).map((x) => x.name)).toEqual(['Neu'])
    await deleteTour(id)
    expect(await listTours()).toEqual([])
  })
})
