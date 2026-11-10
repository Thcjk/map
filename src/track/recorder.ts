import { distance, type RoutePoint } from '../lib/geo'

/** GPS-Messung, unabhängig von der Browser-API (testbar). */
export interface Fix {
  lng: number
  lat: number
  ele: number | null
  /** Genauigkeit in m */
  accuracy: number
  time: number
}

export interface Recording {
  status: 'idle' | 'recording' | 'paused'
  startedAt: number | null
  points: RoutePoint[]
  times: number[]
  distance: number
  /** Aufgezeichnete Zeit ohne Pausen (ms), bis `resumedAt`. */
  activeMs: number
  resumedAt: number | null
  /** Letzte Messung, auch wenn sie nicht aufgezeichnet wurde (für die Anzeige). */
  last: Fix | null
  /** Unterbrüche über 60 s (App im Hintergrund, kein Signal), in ms summiert. */
  gapMs: number
}

export const IDLE: Recording = {
  status: 'idle',
  startedAt: null,
  points: [],
  times: [],
  distance: 0,
  activeMs: 0,
  resumedAt: null,
  last: null,
  gapMs: 0,
}

/** Ungenaue Messungen verwerfen, Stillstand nicht als Strecke zählen. */
export const MAX_ACCURACY_M = 35
export const MIN_STEP_M = 6
const GAP_MS = 60_000

export type RecorderAction =
  | { type: 'start'; time: number }
  | { type: 'pause'; time: number }
  | { type: 'resume'; time: number }
  | { type: 'fix'; fix: Fix }
  | { type: 'restore'; recording: Recording }
  | { type: 'reset' }

export function recorderReducer(s: Recording, a: RecorderAction): Recording {
  switch (a.type) {
    case 'start':
      return { ...IDLE, status: 'recording', startedAt: a.time, resumedAt: a.time, last: s.last }
    case 'pause':
      if (s.status !== 'recording') return s
      return { ...s, status: 'paused', activeMs: s.activeMs + (a.time - (s.resumedAt ?? a.time)), resumedAt: null }
    case 'resume':
      if (s.status !== 'paused') return s
      return { ...s, status: 'recording', resumedAt: a.time }
    case 'restore':
      return a.recording
    case 'reset':
      return { ...IDLE, last: s.last }
    case 'fix': {
      const f = a.fix
      if (s.status !== 'recording' || f.accuracy > MAX_ACCURACY_M) return { ...s, last: f }
      const prev = s.points[s.points.length - 1]
      const prevTime = s.times[s.times.length - 1]
      const p: RoutePoint = [f.lng, f.lat, f.ele]
      if (!prev) return { ...s, last: f, points: [p], times: [f.time] }
      const d = distance(prev, p)
      // Sprünge innerhalb der Messunsicherheit ignorieren
      if (d < Math.max(MIN_STEP_M, f.accuracy / 2)) return { ...s, last: f }
      const gap = f.time - prevTime > GAP_MS ? f.time - prevTime : 0
      return {
        ...s,
        last: f,
        points: [...s.points, p],
        times: [...s.times, f.time],
        distance: s.distance + d,
        gapMs: s.gapMs + gap,
      }
    }
  }
}

/** Aktive Zeit inkl. laufendem Abschnitt. */
export function activeMs(s: Recording, now: number): number {
  return s.activeMs + (s.status === 'recording' && s.resumedAt ? now - s.resumedAt : 0)
}

/** «1:05:09» */
export function formatClock(ms: number): string {
  const t = Math.max(0, Math.floor(ms / 1000))
  const h = Math.floor(t / 3600)
  const m = Math.floor((t % 3600) / 60)
  return `${h}:${String(m).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`
}
