import { describe, expect, it } from 'vitest'
import rules from '../data/rules.json'
import { evaluate, extractSpecs, judgeStrikePrice, matchGpu } from '../shared/rules.js'

const day = 86_400_000
const now = Date.parse('2026-11-27T12:00:00Z')

describe('Mini-PC', () => {
  it('erkennt gute Grafik und Zielpreis', () => {
    const r = evaluate({ text: 'Beelink SER8 Mini PC AMD Ryzen 7 8845HS, 32 GB DDR5, 1 TB SSD', price: 579 }, rules, now)
    expect(r.category).toBe('miniPc')
    expect(r.specs.gpu).toBe('Radeon 780M')
    expect(r.verdict).toBe('good')
  })

  it('warnt über dem Zielpreis', () => {
    const r = evaluate({ text: 'GEEKOM A6 Mini PC Ryzen 7 6800H 32GB RAM', price: 549 }, rules, now)
    expect(r.specs.gpu).toBe('Radeon 680M')
    expect(r.verdict).toBe('check')
  })

  it('lehnt schwache Grafik ab', () => {
    expect(evaluate({ text: 'Mini PC Ryzen 5 7535HS 16GB', price: 300 }, rules, now).verdict).toBe('bad')
    expect(evaluate({ text: 'Mini PC Ryzen 7 5800H 16GB', price: 300 }, rules, now).specs.gpu).toBe('Radeon Vega')
    expect(evaluate({ text: 'Mini PC Intel N100 16GB', price: 150 }, rules, now).verdict).toBe('bad')
  })

  it('Vega-Muster greift nicht bei Zahlen wie «5000 MB/s»', () => {
    expect(matchGpu('Ryzen 7 8845HS SSD 5000 MB/s', rules).name).toBe('Radeon 780M')
  })

  it('erkennt «8845 HS» mit Leerzeichen und «H 255»', () => {
    expect(matchGpu('AMD Ryzen 7 8845 HS', rules).name).toBe('Radeon 780M')
    expect(matchGpu('AMD Ryzen AI 7 H 255', rules).name).toBe('Radeon 780M')
  })

  it('RAM-Regeln: 8 GB, Barebone, Single-Channel', () => {
    expect(evaluate({ text: 'Mini PC Ryzen 7 7840HS 8GB RAM', price: 400 }, rules, now).verdict).toBe('bad')
    const bare = evaluate({ text: 'Mini PC Ryzen 7 7840HS Barebone', price: 350 }, rules, now)
    expect(bare.verdict).toBe('bad')
    expect(bare.reasons.some((x) => x.text.includes('CHF 250–350'))).toBe(true)
    expect(evaluate({ text: 'Mini PC Ryzen 5 7640HS 1x16GB DDR5', price: 400 }, rules, now).verdict).toBe('check')
    expect(extractSpecs('2 x 16 GB DDR5')).toMatchObject({ ramGb: 32, ramModules: 2 })
  })
})

describe('Monitor', () => {
  it('passt zum Suchprofil', () => {
    const r = evaluate({ text: 'ASUS TUF Gaming VG27AQ5A Monitor 27" 2560x1440 IPS 210 Hz DisplayPort', price: 149 }, rules, now)
    expect(r.category).toBe('monitor')
    expect(r.verdict).toBe('good')
  })

  it('warnt bei OLED, 4K/Ultrawide und wenig Hz', () => {
    expect(evaluate({ text: 'Monitor 27" 2560x1440 OLED 240 Hz DisplayPort', price: 600 }, rules, now).verdict).toBe('check')
    const uw = evaluate({ text: 'Monitor 34" 3440x1440 IPS 165 Hz DisplayPort', price: 400 }, rules, now)
    expect(uw.reasons.some((x) => x.text.includes('zu viel für Mini-PC'))).toBe(true)
    expect(evaluate({ text: 'Monitor 27" 2560x1440 IPS 75 Hz DisplayPort', price: 150 }, rules, now).verdict).toBe('check')
  })
})

describe('Statt-Preis', () => {
  const hist = (prices) => prices.map(([d, price]) => ({ t: new Date(now - d * day).toISOString(), price }))

  it('erkennt aufgeblasene Rabatte', () => {
    expect(judgeStrikePrice(500, 800, hist([[10, 490], [3, 520]]), rules, now).text).toContain('aufgeblasen')
    expect(judgeStrikePrice(500, 800, hist([[10, 600], [3, 610]]), rules, now).text).toContain('nie so hoch')
  })

  it('bestätigt echte Rabatte und meldet fehlenden Verlauf', () => {
    expect(judgeStrikePrice(500, 600, hist([[10, 600], [3, 600]]), rules, now).level).toBe('good')
    expect(judgeStrikePrice(500, 600, [], rules, now).text).toContain('noch kein eigener Preisverlauf')
    expect(judgeStrikePrice(500, null, [], rules, now)).toBeNull()
  })
})
