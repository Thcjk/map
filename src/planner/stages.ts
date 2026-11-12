import { indexAtDistance, smoothElevations } from '../lib/geo'
import type { Route } from '../routing/route'
import type { Poi } from '../trails/pois'
import { POI_CATEGORIES } from '../trails/pois'

export type StageMetric = 'distance' | 'ascent' | 'time'

export interface StagePlan {
  metric: StageMetric
  /** Ziel pro Tag: km, Höhenmeter bzw. Stunden. */
  target: number
  /** Indizes der Etappenenden in route.points (ohne Start und Ziel), aufsteigend. */
  cuts: number[]
}

export const METRIC_LABELS: Record<StageMetric, { label: string; unit: string; min: number; max: number; step: number; default: number }> = {
  distance: { label: 'Distanz', unit: 'km', min: 5, max: 60, step: 1, default: 20 },
  ascent: { label: 'Bergauf', unit: 'Hm', min: 200, max: 2500, step: 50, default: 1000 },
  time: { label: 'Gehzeit', unit: 'h', min: 2, max: 12, step: 0.5, default: 6 },
}

export interface Stage {
  index: number
  from: number
  to: number
  distance: number
  ascent: number
  descent: number
  minutes: number
  startKm: number
}

/** Kumulierte Werte der gewählten Messgrösse (m, Hm bzw. min) pro Punkt. */
export function cumulativeMetric(route: Route, metric: StageMetric): number[] {
  if (metric === 'distance') return route.cum
  if (metric === 'time') return route.minutes
  const ele = smoothElevations(route.points.map((p) => p[2]))
  const out = new Array<number>(ele.length)
  out[0] = 0
  for (let i = 1; i < ele.length; i++) out[i] = out[i - 1] + Math.max(0, (ele[i] ?? 0) - (ele[i - 1] ?? 0))
  return out
}

const toBase = (metric: StageMetric, target: number) =>
  metric === 'distance' ? target * 1000 : metric === 'time' ? target * 60 : target

/** Gleichmässige Aufteilung, sodass keine Etappe das Tagesziel deutlich überschreitet. */
export function autoCuts(route: Route, metric: StageMetric, target: number): number[] {
  const cum = cumulativeMetric(route, metric)
  const total = cum[cum.length - 1] ?? 0
  const n = Math.max(1, Math.ceil(total / toBase(metric, target) - 0.05))
  const cuts: number[] = []
  for (let k = 1; k < n; k++) {
    const idx = indexAtDistance(cum, (total * k) / n)
    const prev = cuts[cuts.length - 1] ?? 0
    if (idx > prev && idx < route.points.length - 1) cuts.push(idx)
  }
  return cuts
}

export function stagesOf(route: Route, cuts: number[]): Stage[] {
  const bounds = [0, ...cuts, route.points.length - 1]
  const ele = smoothElevations(route.points.map((p) => p[2]))
  return bounds.slice(1).map((to, i) => {
    const from = bounds[i]
    let ascent = 0
    let descent = 0
    for (let j = from + 1; j <= to; j++) {
      const d = (ele[j] ?? 0) - (ele[j - 1] ?? 0)
      if (d > 0) ascent += d
      else descent -= d
    }
    return {
      index: i,
      from,
      to,
      distance: route.cum[to] - route.cum[from],
      ascent,
      descent,
      minutes: route.minutes[to] - route.minutes[from],
      startKm: route.cum[from],
    }
  })
}

/** Etappenende verschieben, ohne Nachbarn zu überholen. */
export function moveCut(cuts: number[], i: number, index: number, pointCount: number): number[] {
  const lo = (cuts[i - 1] ?? 0) + 1
  const hi = (cuts[i + 1] ?? pointCount - 1) - 1
  if (lo > hi) return cuts
  return cuts.map((c, j) => (j === i ? Math.min(hi, Math.max(lo, index)) : c))
}

const SLEEP = new Set(POI_CATEGORIES.filter((c) => c.sleep).map((c) => c.id))

/** Übernachtungsmöglichkeiten nahe einem Etappenende (entlang der Route ± window m). */
export function sleepSuggestions(pois: Poi[], endAlong: number, window = 3000): Poi[] {
  return pois
    .filter((p) => SLEEP.has(p.category) && Math.abs(p.along - endAlong) <= window)
    .sort((a, b) => Math.abs(a.along - endAlong) + a.offRoute - (Math.abs(b.along - endAlong) + b.offRoute))
}

/** Jedes Etappenende zur nächsten Übernachtung schieben, wenn eine in Reichweite liegt. */
export function snapCutsToSleep(route: Route, cuts: number[], pois: Poi[]): number[] {
  let out = [...cuts]
  out.forEach((c, i) => {
    const stageLen = route.cum[c] - route.cum[out[i - 1] ?? 0]
    const best = sleepSuggestions(pois, route.cum[c], Math.min(5000, stageLen * 0.2))[0]
    if (best) out = moveCut(out, i, indexAtDistance(route.cum, best.along), route.points.length)
  })
  return out
}
