import type { Activity } from '../lib/db'
import type { MotifId } from './motifs'

export interface Milestone {
  id: string
  motif: MotifId
  title: string
  description: string
  /** Fortschritt 0…1 und Datum des Erreichens (falls erreicht). */
  evaluate: (activities: Activity[]) => { progress: number; achievedAt: number | null }
}

const dayKey = (t: number) => {
  const d = new Date(t)
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`
}
const DAY = 86_400_000

/** Datum, an dem die laufende Summe den Zielwert erreicht. */
function reachedAt(activities: Activity[], value: (a: Activity) => number, target: number) {
  let sum = 0
  for (const a of [...activities].sort((x, y) => x.startedAt - y.startedAt)) {
    sum += value(a)
    if (sum >= target) return { progress: 1, achievedAt: a.startedAt }
  }
  return { progress: sum / target, achievedAt: null }
}

export const MILESTONES: Milestone[] = [
  {
    id: 'first',
    motif: 'first',
    title: 'Erste Tour',
    description: 'Die erste aufgezeichnete oder importierte Tour.',
    evaluate: (a) => reachedAt(a, () => 1, 1),
  },
  {
    id: 'km100',
    motif: 'km100',
    title: 'Erste 100 km',
    description: '100 km insgesamt gewandert.',
    evaluate: (a) => reachedAt(a, (x) => x.distance, 100_000),
  },
  {
    id: 'km500',
    motif: 'km500',
    title: '500 km',
    description: '500 km insgesamt gewandert.',
    evaluate: (a) => reachedAt(a, (x) => x.distance, 500_000),
  },
  {
    id: 'hm1000',
    motif: 'hm1000',
    title: '1000 Hm an einem Tag',
    description: 'Mindestens 1000 Höhenmeter Aufstieg an einem einzigen Tag.',
    evaluate: (activities) => {
      const perDay = new Map<string, { ascent: number; at: number }>()
      for (const a of activities) {
        const k = dayKey(a.startedAt)
        const e = perDay.get(k) ?? { ascent: 0, at: a.startedAt }
        perDay.set(k, { ascent: e.ascent + a.ascent, at: Math.min(e.at, a.startedAt) })
      }
      const days = [...perDay.values()]
      const hit = days.filter((d) => d.ascent >= 1000).sort((x, y) => x.at - y.at)[0]
      return hit ? { progress: 1, achievedAt: hit.at } : { progress: Math.max(0, ...days.map((d) => d.ascent)) / 1000, achievedAt: null }
    },
  },
  {
    id: 'multiday',
    motif: 'multiday',
    title: 'Erste Mehrtagestour',
    description: 'An zwei aufeinanderfolgenden Tagen gewandert.',
    evaluate: (activities) => {
      const days = [...new Set(activities.map((a) => Math.floor((a.startedAt - new Date(a.startedAt).getTimezoneOffset() * 60_000) / DAY)))].sort((x, y) => x - y)
      for (let i = 1; i < days.length; i++) {
        if (days[i] - days[i - 1] === 1) {
          const second = activities.filter((a) => Math.floor((a.startedAt - new Date(a.startedAt).getTimezoneOffset() * 60_000) / DAY) === days[i])
          return { progress: 1, achievedAt: Math.min(...second.map((a) => a.startedAt)) }
        }
      }
      return { progress: days.length ? 0.5 : 0, achievedAt: null }
    },
  },
]
