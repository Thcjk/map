import { describe, expect, it } from 'vitest'
import { applyMeasurement, isDue, message } from '../scraper/lib/prices.js'
import { availabilityOf, bestMatch, parseSearch, productIdFromUrl } from '../scraper/shops/galaxus.js'

const T0 = Date.parse('2026-11-21T00:00:00Z')
const h = 3_600_000

describe('Preisverlauf und Alarme', () => {
  it('erste Messung: kein Tiefstpreis-Alarm, aber Zielpreis-Alarm wenn schon darunter', () => {
    const { entry, events } = applyMeasurement(undefined, { price: 140, available: true }, 150, T0)
    expect(entry.lowest.price).toBe(140)
    expect(events.map((e) => e.type)).toEqual(['target'])
  })

  it('Zielpreis nur beim Unterschreiten, nicht bei jeder Prüfung', () => {
    let { entry } = applyMeasurement(undefined, { price: 164, available: true }, 150, T0)
    let r = applyMeasurement(entry, { price: 149, available: true }, 150, T0 + 6 * h)
    expect(r.events.map((e) => e.type)).toEqual(['target', 'lowest'])
    r = applyMeasurement(r.entry, { price: 149, available: true }, 150, T0 + 12 * h)
    expect(r.events).toEqual([])
    r = applyMeasurement(r.entry, { price: 155, available: true }, 150, T0 + 18 * h)
    r = applyMeasurement(r.entry, { price: 150, available: true }, 150, T0 + 24 * h)
    expect(r.events.map((e) => e.type)).toEqual(['target'])
  })

  it('meldet neuen Tiefstpreis und Wiederverfügbarkeit', () => {
    let { entry } = applyMeasurement(undefined, { price: 600, available: false }, 500, T0)
    const r = applyMeasurement(entry, { price: 580, available: true }, 500, T0 + h)
    expect(r.events.map((e) => e.type)).toEqual(['lowest', 'restock'])
    expect(r.entry.history).toHaveLength(2)
  })

  it('unbekannte Verfügbarkeit löst keinen Alarm aus', () => {
    let { entry } = applyMeasurement(undefined, { price: 600, available: null }, 500, T0)
    expect(applyMeasurement(entry, { price: 600, available: true }, 500, T0 + h).events).toEqual([])
  })

  it('formuliert Nachrichten', () => {
    expect(message({ type: 'target', price: 149, targetPrice: 150 }, 'ASUS').body).toBe('Jetzt CHF 149.– (dein Ziel: CHF 150.–).')
  })

  it('Takt: alle 6 Stunden oder stündlich', () => {
    expect(isDue(6, Date.parse('2026-11-21T06:10:00Z'))).toBe(true)
    expect(isDue(6, Date.parse('2026-11-21T07:10:00Z'))).toBe(false)
    expect(isDue(1, Date.parse('2026-11-21T07:10:00Z'))).toBe(true)
    expect(isDue(6, Date.parse('2026-11-21T07:10:00Z'), true)).toBe(true)
  })
})

describe('Galaxus-Schnittstelle', () => {
  const fixture = {
    _meta: {
      response: {
        data: {
          serverToolShopSearch: {
            products: {
              edges: [
                { node: { trackingId: 1, name: 'TUF Gaming VG27AQML5A', nameWithProperties: 'TUF Gaming VG27AQML5A (2560 x 1440 Pixel, 27")', brand: { name: 'ASUS' }, productType: { name: 'Monitor' }, price: { amountInclusive: 230 }, insteadOfPrice: null, availability: { availabilityClassification: 'FULL' }, relativeUrl: '/de/s1/product/x-1' } },
                { node: { trackingId: 59382254, name: 'TUF Gaming VG27AQ5A', nameWithProperties: 'TUF Gaming VG27AQ5A (2560 x 1440 Pixel, 27")', brand: { name: 'ASUS' }, productType: { name: 'Monitor' }, description: 'IPS 210 Hz', price: { amountInclusive: 164, currency: 'CHF' }, insteadOfPrice: { price: { amountInclusive: 199 } }, availability: { availabilityClassification: 'TICK' }, relativeUrl: '/de/s1/product/asus-tuf-gaming-vg27aq5a-2560-x-1440-pixel-27-monitor-59382254' } },
              ],
            },
          },
        },
      },
    },
  }

  it('liest Preis, Statt-Preis, Verfügbarkeit und Link', () => {
    const [, p] = parseSearch(fixture)
    expect(p).toMatchObject({ productId: 59382254, price: 164, strikePrice: 199, availability: 'TICK', url: 'https://www.galaxus.ch/de/s1/product/asus-tuf-gaming-vg27aq5a-2560-x-1440-pixel-27-monitor-59382254' })
  })

  it('findet die Produkt-ID in Digitec- und Galaxus-Links', () => {
    expect(productIdFromUrl('https://www.digitec.ch/de/s1/product/asus-tuf-gaming-vg27aq5a-2560-x-1440-pixel-27-monitor-59382254')).toBe(59382254)
    expect(productIdFromUrl('https://www.galaxus.ch/de/s1/product/59382254?foo=1')).toBe(59382254)
    expect(productIdFromUrl(null)).toBeNull()
  })

  it('wählt ohne ID den Treffer, der alle Suchwörter enthält', () => {
    expect(bestMatch(parseSearch(fixture), 'ASUS TUF Gaming VG27AQ5A').productId).toBe(59382254)
  })

  it('deutet Verfügbarkeit nur bei bekannten Werten', () => {
    expect(availabilityOf('TICK', 100)).toBe(true)
    expect(availabilityOf('WHATEVER', 100)).toBeNull()
    expect(availabilityOf('TICK', null)).toBe(false)
  })
})
