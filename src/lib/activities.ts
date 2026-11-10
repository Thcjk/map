import { db, type Activity } from './db'
import { cumulativeDistances, elevationGainLoss, type RoutePoint } from './geo'
import type { GpxData } from './gpx'

/** GPS-Höhen rauschen stärker als Kartenhöhen: grösserer Schwellwert. */
const GPS_ELEVATION_THRESHOLD = 10

export function buildActivity(
  name: string,
  source: Activity['source'],
  points: RoutePoint[],
  times: (number | null)[],
  durationMs: number | null,
): Activity {
  const { ascent, descent } = elevationGainLoss(points.map((p) => p[2]), GPS_ELEVATION_THRESHOLD)
  const first = times.find((t) => t !== null) ?? null
  const last = [...times].reverse().find((t) => t !== null) ?? null
  return {
    id: crypto.randomUUID(),
    name: name.trim() || 'Unbenannte Tour',
    source,
    startedAt: first ?? Date.now(),
    points,
    times,
    distance: cumulativeDistances(points).at(-1) ?? 0,
    ascent,
    descent,
    durationMs: durationMs ?? (first !== null && last !== null && last > first ? last - first : null),
  }
}

export async function saveActivity(a: Activity) {
  await db.activities.put(a)
  return a.id
}

export const activityFromGpx = (g: GpxData) => buildActivity(g.name, 'gpx', g.points, g.times, null)
export const listActivities = () => db.activities.orderBy('startedAt').reverse().toArray()
export const deleteActivity = (id: string) => db.activities.delete(id)
