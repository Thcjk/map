import { db, type Tour } from './db'
import type { Plan } from '../planner/plannerState'
import type { Route } from '../routing/route'
import type { StagePlan } from '../planner/stages'

export async function saveTour(
  name: string,
  plan: Plan,
  route: Route,
  id?: string,
  stages: StagePlan | null = null,
): Promise<string> {
  const now = Date.now()
  const existing = id ? await db.tours.get(id) : undefined
  const tour: Tour = {
    id: existing?.id ?? crypto.randomUUID(),
    name: name.trim() || 'Unbenannte Tour',
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
    plan,
    points: route.points,
    ways: route.ways,
    distance: route.distance,
    ascent: route.ascent,
    descent: route.descent,
    duration: route.duration,
    stages,
    isPublic: existing?.isPublic ?? false,
    dirty: 1,
  }
  await db.tours.put(tour)
  notifyLocalChange()
  return tour.id
}

export const listTours = async () =>
  (await db.tours.orderBy('updatedAt').reverse().toArray()).filter((t) => !t.deleted)

export async function getTour(id: string) {
  const t = await db.tours.get(id)
  return t && !t.deleted ? t : undefined
}

/** Löschen als Markierung, damit die Löschung auch in der Cloud ankommt. */
export async function deleteTour(id: string) {
  await db.tours.update(id, { deleted: true, dirty: 1, updatedAt: Date.now() })
  notifyLocalChange()
}

export async function setTourPublic(id: string, isPublic: boolean) {
  await db.tours.update(id, { isPublic, dirty: 1, updatedAt: Date.now() })
  notifyLocalChange()
}

/** Meldet lokale Änderungen, damit der Cloud-Abgleich (falls aktiv) bald startet. */
export function notifyLocalChange() {
  window.dispatchEvent(new Event('local-data-changed'))
}
