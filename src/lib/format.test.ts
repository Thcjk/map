import { describe, expect, it } from 'vitest'
import { formatKm, formatM } from './format'

describe('format', () => {
  it('formatiert nach Schweizer Konvention', () => {
    expect(formatKm(4321)).toBe('4.3 km')
    expect(formatKm(123456)).toBe('123 km')
    expect(formatM(1250.4)).toMatch(/^1.250 m$/)
  })
})
