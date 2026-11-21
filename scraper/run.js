// Preisprüfung: liest data/wishlist.json, fragt pro Produkt den zuständigen Shop ab,
// schreibt data/prices.json und schickt ntfy-Benachrichtigungen.
// Lokal: node scraper/run.js --force   (ohne NTFY_TOPIC wird nur in die Konsole geschrieben)
import { readFile, writeFile } from 'node:fs/promises'
import { notify } from './lib/ntfy.js'
import { applyMeasurement, isDue, message } from './lib/prices.js'
import { shopFor } from './shops/index.js'

const DATA = new URL('../data/', import.meta.url)
const read = async (f) => JSON.parse(await readFile(new URL(f, DATA), 'utf8'))
const write = (f, v) => writeFile(new URL(f, DATA), JSON.stringify(v, null, 1) + '\n')
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const now = Date.now()
const settings = await read('settings.json')
const force = process.argv.includes('--force') || process.env.FORCE === 'true'
if (!isDue(settings.intervalHours, now, force)) {
  console.log(`Nicht fällig (Takt: alle ${settings.intervalHours} h).`)
  process.exit(0)
}

const wishlist = await read('wishlist.json')
const prices = await read('prices.json')
const manual = await read('manual.json')
let wishlistChanged = false
const summary = []

for (const item of wishlist.products) {
  const shop = shopFor(item)
  const prev = prices.products[item.id]
  let result
  try {
    result = await shop.check(item)
  } catch (e) {
    result = { status: 'error', error: e.message }
  }

  // Von Hand eingetragener Preis (blockierte Shops): einmal übernehmen, dann verbraucht
  const hand = manual.entries[item.id]
  if (result.status !== 'ok' && hand && (!prev?.current?.at || Date.parse(hand.at) > Date.parse(prev.current.at))) {
    result = { status: 'manual', price: hand.price, available: hand.available ?? null, strikePrice: null }
  }

  const base = { ...prev, name: item.name, shop: shop.name, status: result.status, error: result.error ?? null, checkedAt: new Date(now).toISOString() }
  if (result.status === 'ok' || result.status === 'manual') {
    const { entry, events } = applyMeasurement(prev, { price: result.price, strikePrice: result.strikePrice, available: result.available, source: result.status === 'manual' ? 'manual' : undefined }, item.targetPrice, now)
    Object.assign(base, entry, {
      url: result.url ?? item.url ?? prev?.url ?? null,
      matchedName: result.matchedName ?? prev?.matchedName ?? null,
      availabilityRaw: result.availabilityRaw ?? null,
      specsText: result.specsText ?? prev?.specsText ?? null,
    })
    // gefundene Produkt-ID merken, damit künftig genau dieses Produkt geprüft wird
    if (result.productId && item.productId !== result.productId) {
      item.productId = result.productId
      item.url ??= result.url
      wishlistChanged = true
    }
    for (const ev of events) {
      const msg = message(ev, item.name)
      try {
        await notify({ ...msg, click: base.url ?? undefined })
      } catch (e) {
        console.error('Benachrichtigung fehlgeschlagen:', e.message)
      }
    }
    summary.push(`${item.name}: ${result.price ?? '–'} CHF${result.available === false ? ' (nicht verfügbar)' : ''}${events.length ? ` → ${events.map((e) => e.type).join(', ')}` : ''}`)
  } else {
    summary.push(`${item.name}: ${result.status} – ${result.error}`)
  }
  prices.products[item.id] = base
  await sleep(2500) // höflich: nicht im Sekundentakt abfragen
}

// Einträge entfernter Produkte löschen
for (const id of Object.keys(prices.products)) if (!wishlist.products.some((p) => p.id === id)) delete prices.products[id]
prices.updatedAt = new Date(now).toISOString()
await write('prices.json', prices)
if (wishlistChanged) await write('wishlist.json', wishlist)
console.log(summary.join('\n'))
