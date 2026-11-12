import { db, type Trail } from '../lib/db'
import { addElevations } from '../lib/elevation'
import { assembleRelation } from './assemble'
import { overpass } from './overpass'
import { relationQuery, type TrailHit } from './search'

/** OSM-Daten ändern sich selten; nach 30 Tagen wird neu geladen. */
const MAX_AGE_MS = 30 * 24 * 3600 * 1000

export type LoadStep = 'osm' | 'elevation'

export async function loadTrail(
  hit: Pick<TrailHit, 'id' | 'name' | 'ref' | 'network'>,
  onStep: (step: LoadStep, share?: number) => void,
  signal?: AbortSignal,
): Promise<Trail> {
  const cached = await db.trails.get(hit.id)
  if (cached && Date.now() - cached.fetchedAt < MAX_AGE_MS) return cached
  onStep('osm')
  const elements = await overpass(relationQuery(hit.id), signal)
  const { points, gaps } = assembleRelation(hit.id, elements)
  if (points.length < 2) throw new Error('Für diesen Weg sind in OSM keine Wegstücke hinterlegt.')
  onStep('elevation', 0)
  // Ohne Höhen ist der Weg trotzdem nutzbar (Distanz, Etappen nach km).
  const withEle = await addElevations(points, signal, (s) => onStep('elevation', s)).catch((e) => {
    if (signal?.aborted) throw e
    return points
  })
  const trail: Trail = { id: hit.id, name: hit.name, ref: hit.ref, network: hit.network, points: withEle, gaps, fetchedAt: Date.now() }
  await db.trails.put(trail)
  return trail
}
