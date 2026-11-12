import { describe, expect, it } from 'vitest'
import { chooseZoom, decodeTerrarium, sampleBilinear, worldPixel } from './elevation'

describe('elevation', () => {
  it('dekodiert Terrarium-Pixel', () => {
    // 1000 m = 33768 = 131 * 256 + 232
    expect(decodeTerrarium(131, 232, 0)).toBe(1000)
  })

  it('rechnet Weltpixel', () => {
    expect(worldPixel(0, 0, 0)).toEqual([128, 128])
  })

  it('interpoliert zwischen Pixeln', () => {
    const tile = new Float32Array(256 * 256)
    tile[0] = 100 // Pixel (0,0)
    tile[1] = 200 // Pixel (1,0)
    expect(sampleBilinear(tile, 0.5, 0.5)).toBe(100) // Pixelmitte
    expect(sampleBilinear(tile, 1, 0.5)).toBe(150) // genau dazwischen
    expect(sampleBilinear(tile, 0, 0)).toBe(100) // Rand: nächster Pixel
  })

  it('wählt bei langen Routen einen kleineren Zoom', () => {
    const short = Array.from({ length: 50 }, (_, i) => [7 + i * 0.001, 46, null] as [number, number, null])
    const long = Array.from({ length: 4000 }, (_, i) => [-9 + i * 0.01, 43, null] as [number, number, null])
    expect(chooseZoom(short)).toBe(12)
    expect(chooseZoom(long)).toBeLessThan(12)
  })
})
