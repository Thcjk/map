// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { parseGpx, toGpx } from './gpx'

describe('GPX', () => {
  it('exportiert und importiert verlustfrei', () => {
    const xml = toGpx('Über den «Pass» & zurück', [
      [7.1, 46.1, 1200.5],
      [7.2, 46.2, null],
    ], [[7.1, 46.1]])
    const data = parseGpx(xml)
    expect(data.name).toBe('Über den «Pass» & zurück')
    expect(data.points).toEqual([
      [7.1, 46.1, 1200.5],
      [7.2, 46.2, null],
    ])
    expect(data.waypoints).toHaveLength(1)
  })

  it('liest Routen und Zeitstempel', () => {
    const data = parseGpx(`<gpx><rte><name>R</name>
      <rtept lat="46" lon="7"><time>2026-06-01T08:00:00Z</time></rtept>
      <rtept lat="46.1" lon="7.1"/></rte></gpx>`)
    expect(data.name).toBe('R')
    expect(data.times[0]).toBe(Date.parse('2026-06-01T08:00:00Z'))
  })

  it('meldet ungültige Dateien', () => {
    expect(() => parseGpx('kein xml')).toThrow()
  })
})
