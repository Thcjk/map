// Preisverlauf fortschreiben und erkennen, wann eine Benachrichtigung fällig ist.
// Reine Funktionen (ohne Netz, ohne Dateien), darum gut testbar.

const MAX_HISTORY = 2000

/**
 * Neue Messung in den Datensatz eines Produkts übernehmen.
 * @param prev bisheriger Eintrag aus prices.json (oder undefined)
 * @param m    Messung: { price, strikePrice, available, source }
 * @returns { entry, events } – events: [{ type: 'target'|'lowest'|'restock', … }]
 */
export function applyMeasurement(prev, m, targetPrice, now) {
  const t = new Date(now).toISOString()
  const history = [...(prev?.history ?? []), { t, price: m.price ?? null, available: m.available ?? null, ...(m.source ? { source: m.source } : {}) }].slice(-MAX_HISTORY)
  const before = prev?.current ?? null
  const lowest = prev?.lowest ?? null
  const events = []

  if (m.price != null) {
    // Zielpreis: nur beim Unterschreiten melden, nicht bei jeder Prüfung erneut
    const wasAbove = before?.price == null || before.price > targetPrice
    if (targetPrice != null && m.price <= targetPrice && wasAbove) events.push({ type: 'target', price: m.price, targetPrice })
    // Neuer Tiefstpreis: erst ab der zweiten Messung sinnvoll
    if (lowest && m.price < lowest.price) events.push({ type: 'lowest', price: m.price, previousLowest: lowest.price })
  }
  // Wieder verfügbar: nur wenn vorher sicher «nicht verfügbar» gemessen wurde
  if (before?.available === false && m.available === true) events.push({ type: 'restock', price: m.price })

  const entry = {
    ...prev,
    current: { price: m.price ?? null, strikePrice: m.strikePrice ?? null, available: m.available ?? null, at: t, ...(m.source ? { source: m.source } : {}) },
    lowest: m.price != null && (!lowest || m.price < lowest.price) ? { price: m.price, at: t } : lowest,
    history,
  }
  return { entry, events }
}

/** Text für die Benachrichtigung. */
export function message(event, name) {
  const chf = (n) => `CHF ${Number(n).toFixed(2).replace(/\.00$/, '.–')}`
  switch (event.type) {
    case 'target':
      return { title: `🎯 Zielpreis erreicht: ${name}`, body: `Jetzt ${chf(event.price)} (dein Ziel: ${chf(event.targetPrice)}).`, priority: 5, tags: ['dart'] }
    case 'lowest':
      return { title: `📉 Neuer Tiefstpreis: ${name}`, body: `Jetzt ${chf(event.price)}, bisher tiefster ${chf(event.previousLowest)}.`, priority: 4, tags: ['chart_with_downwards_trend'] }
    case 'restock':
      return { title: `📦 Wieder verfügbar: ${name}`, body: event.price != null ? `Preis: ${chf(event.price)}.` : 'Wieder lieferbar.', priority: 4, tags: ['package'] }
    default:
      return null
  }
}

/** Soll in dieser Stunde geprüft werden? (Die Action läuft stündlich; settings.intervalHours bestimmt den Takt.) */
export function isDue(intervalHours, now, force = false) {
  if (force) return true
  const hours = Math.max(1, Math.round(intervalHours || 6))
  return new Date(now).getUTCHours() % hours === 0
}
