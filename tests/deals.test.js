import { describe, expect, it } from 'vitest'
import { SORTS, summarize } from '../app/src/deals.js'

const now = Date.parse('2026-11-27T12:00:00Z')
const hist = (prices) => prices.map((price, i) => ({ t: new Date(now - (prices.length - i) * 86_400_000).toISOString(), price }))

describe('Dashboard-Kennzahlen', () => {
  it('Rabatt gegenüber dem gemessenen Höchstpreis, Schnäppchen unter Ziel', () => {
    const s = summarize({ targetPrice: 150 }, { current: { price: 149 }, lowest: { price: 149 }, history: hist([180, 170, 149]) }, now)
    expect(s.discount).toBe(17)
    expect(s.toTarget).toBe(-1)
    expect(s.bargain).toBe(true)
  })

  it('kein Schnäppchen ohne Verlauf und über Ziel', () => {
    const s = summarize({ targetPrice: 490 }, { current: { price: 565.74 }, lowest: { price: 565.74 }, history: hist([565.74]) }, now)
    expect(s.discount).toBe(0)
    expect(s.bargain).toBe(false)
  })

  it('sortiert nach Rabatt', () => {
    const rows = [
      { item: { name: 'A' }, s: { discount: 2, toTarget: 10 } },
      { item: { name: 'B' }, s: { discount: 20, toTarget: 50 } },
    ]
    expect(rows.sort(SORTS.discount.fn).map((r) => r.item.name)).toEqual(['B', 'A'])
  })
})
