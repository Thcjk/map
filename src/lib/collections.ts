import { db, type Collection } from './db'
import { notifyLocalChange } from './tours'

export const listCollections = async () =>
  (await db.collections.orderBy('updatedAt').reverse().toArray()).filter((c) => !c.deleted)

export async function createCollection(name: string): Promise<string> {
  const c: Collection = { id: crypto.randomUUID(), name: name.trim() || 'Sammlung', tourIds: [], updatedAt: Date.now(), dirty: 1 }
  await db.collections.put(c)
  notifyLocalChange()
  return c.id
}

export async function toggleTourInCollection(collectionId: string, tourId: string) {
  const c = await db.collections.get(collectionId)
  if (!c) return
  const tourIds = c.tourIds.includes(tourId) ? c.tourIds.filter((t) => t !== tourId) : [...c.tourIds, tourId]
  await db.collections.update(collectionId, { tourIds, updatedAt: Date.now(), dirty: 1 })
  notifyLocalChange()
}

export async function deleteCollection(id: string) {
  await db.collections.update(id, { deleted: true, dirty: 1, updatedAt: Date.now() })
  notifyLocalChange()
}
