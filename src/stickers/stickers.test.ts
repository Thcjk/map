import { describe, expect, it } from 'vitest'
import type { Activity } from '../lib/db'
import type { LngLat } from '../lib/geo'
import { buildTrackIndex, coverage } from './coverage'
import { MILESTONES } from './milestones'

// Weg: 10 km nach Norden
const trail: LngLat[] = Array.from({ length: 101 }, (_, i) => [7, 46 + i * 0.0009])

describe('Abdeckung', () => {
  it('ist 0 ohne eigene Spuren', () => {
    expect(coverage(trail, buildTrackIndex([])).share).toBe(0)
  })

  it('zählt nur den begangenen Teil, auch bei groben GPX-Punkten und leichtem Versatz', () => {
    // erste Hälfte begangen, Punkte alle ~300 m, 30 m neben dem Weg
    const track: LngLat[] = Array.from({ length: 18 }, (_, i) => [7.0004, 46 + i * 0.0027])
    const c = coverage(trail, buildTrackIndex([track]))
    expect(c.share).toBeGreaterThan(0.44)
    expect(c.share).toBeLessThan(0.54)
    expect(c.totalM / 1000).toBeCloseTo(10, 0)
  })

  it('zählt parallele Wege in 200 m Abstand nicht', () => {
    const track: LngLat[] = trail.map(([lng, lat]) => [lng + 0.0026, lat])
    expect(coverage(trail, buildTrackIndex([track])).share).toBe(0)
  })

  it('erreicht mit mehreren Touren die volle Abdeckung', () => {
    const a = trail.slice(0, 55)
    const b = trail.slice(50)
    expect(coverage(trail, buildTrackIndex([a, b])).share).toBeGreaterThan(0.98)
  })
})

const act = (startedAt: string, km: number, ascent: number): Activity => ({
  id: startedAt,
  name: 'x',
  source: 'gpx',
  startedAt: new Date(startedAt).getTime(),
  points: [],
  times: [],
  distance: km * 1000,
  ascent,
  descent: 0,
  durationMs: null,
})
const result = (id: string, a: Activity[]) => MILESTONES.find((m) => m.id === id)!.evaluate(a)

describe('Meilensteine', () => {
  const acts = [act('2026-07-01T08:00', 40, 600), act('2026-07-01T15:00', 10, 500), act('2026-07-02T08:00', 55, 300)]

  it('erkennt 100 km und das Datum', () => {
    expect(result('km100', acts)).toEqual({ progress: 1, achievedAt: acts[2].startedAt })
    expect(result('km500', acts).progress).toBeCloseTo(0.21)
  })

  it('summiert Höhenmeter pro Tag', () => {
    expect(result('hm1000', acts).progress).toBe(1)
    expect(result('hm1000', [acts[0]]).progress).toBeCloseTo(0.6)
  })

  it('erkennt die Mehrtagestour', () => {
    expect(result('multiday', acts).achievedAt).toBe(acts[2].startedAt)
    expect(result('multiday', [acts[0], act('2026-07-05T08:00', 5, 0)]).achievedAt).toBeNull()
    expect(result('first', []).progress).toBe(0)
  })
})
