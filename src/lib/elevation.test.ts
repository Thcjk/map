import { describe, expect, it } from 'vitest'
import { chooseZoom, decodeTerrarium, worldPixel } from './elevation'

describe('elevation', () => {
  it('dekodiert Terrarium-Pixel', () => {
    // 1000 m = 33768 = 131 * 256 + 232
    expect(decodeTerrarium(131, 232, 0)).toBe(1000)
  })

  it('rechnet Weltpixel', () => {
    expect(worldPixel(0, 0, 0)).toEqual([128, 128])
  })

  it('wählt bei langen Routen einen kleineren Zoom', () => {
    const short = Array.from({ length: 50 }, (_, i) => [7 + i * 0.001, 46, null] as [number, number, null])
    const long = Array.from({ length: 2000 }, (_, i) => [-9 + i * 0.01, 43, null] as [number, number, null])
    expect(chooseZoom(short)).toBe(12)
    expect(chooseZoom(long)).toBeLessThan(12)
  })
})
