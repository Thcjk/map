import { db, type Tour } from './db'
import type { Plan } from '../planner/plannerState'
import type { Route } from '../routing/route'

export async function saveTour(name: string, plan: Plan, route: Route, id?: string): Promise<string> {
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
  }
  await db.tours.put(tour)
  return tour.id
}

export const listTours = () => db.tours.orderBy('updatedAt').reverse().toArray()
export const getTour = (id: string) => db.tours.get(id)
export const deleteTour = (id: string) => db.tours.delete(id)
