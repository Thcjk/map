import { describe, expect, it } from 'vitest'
import { activeMs, formatClock, IDLE, recorderReducer, type Fix, type RecorderAction } from './recorder'

const fix = (i: number, extra: Partial<Fix> = {}): Fix => ({ lng: 7, lat: 46 + i * 0.0001, ele: 1000 + i, accuracy: 8, time: 1000 + i * 10_000, ...extra })
const run = (actions: RecorderAction[]) => actions.reduce(recorderReducer, IDLE)

describe('Recorder', () => {
  it('zeichnet Strecke auf und filtert ungenaue Messungen und Stillstand', () => {
    const s = run([
      { type: 'start', time: 0 },
      { type: 'fix', fix: fix(0) },
      { type: 'fix', fix: fix(1) }, // ~11 m
      { type: 'fix', fix: fix(1.2) }, // ~2 m: Stillstand
      { type: 'fix', fix: fix(5, { accuracy: 80 }) }, // zu ungenau
      { type: 'fix', fix: fix(2) },
    ])
    expect(s.points).toHaveLength(3)
    expect(s.distance).toBeCloseTo(22.2, 0)
    expect(s.last?.lat).toBeCloseTo(46.0002)
  })

  it('zählt Pausen nicht zur Zeit und zeichnet in der Pause nichts auf', () => {
    const s = run([
      { type: 'start', time: 0 },
      { type: 'pause', time: 60_000 },
      { type: 'fix', fix: fix(3) },
      { type: 'resume', time: 300_000 },
    ])
    expect(s.points).toHaveLength(0)
    expect(activeMs(s, 330_000)).toBe(90_000)
  })

  it('merkt sich Unterbrüche', () => {
    const s = run([
      { type: 'start', time: 0 },
      { type: 'fix', fix: fix(0) },
      { type: 'fix', fix: fix(10, { time: 400_000 }) },
    ])
    expect(s.gapMs).toBeGreaterThan(300_000)
  })

  it('formatiert die Uhr', () => {
    expect(formatClock(3_909_000)).toBe('1:05:09')
  })
})
