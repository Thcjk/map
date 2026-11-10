import { describe, expect, it } from 'vitest'
import { isInSwitzerland } from './switzerland'

describe('isInSwitzerland', () => {
  it.each([
    ['Bern', 7.44, 46.95],
    ['Zermatt', 7.75, 46.02],
    ['St. Moritz', 9.84, 46.5],
    ['Genf', 6.14, 46.2],
    ['Lugano', 8.95, 46.0],
  ])('%s liegt in der Schweiz', (_n, lng, lat) => {
    expect(isInSwitzerland(lng, lat)).toBe(true)
  })

  it.each([
    ['Mailand', 9.19, 45.46],
    ['Freiburg i. Br.', 7.85, 47.99],
    ['Chamonix', 6.87, 45.92],
    ['Innsbruck', 11.39, 47.27],
    ['Lissabon', -9.14, 38.72],
  ])('%s liegt nicht in der Schweiz', (_n, lng, lat) => {
    expect(isInSwitzerland(lng, lat)).toBe(false)
  })
})
