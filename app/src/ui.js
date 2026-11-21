// Kleine Helfer für die Oberfläche.

/** Text sicher in HTML einsetzen (verhindert, dass Produktnamen HTML einschleusen). */
export const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c])

const nf = new Intl.NumberFormat('de-CH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
/** «CHF 1’127.00» bzw. «CHF 164.–» */
export const chf = (n) => (n == null ? '–' : `CHF ${nf.format(n).replace(/\.00$/, '.–')}`)

const dtf = new Intl.DateTimeFormat('de-CH', { dateStyle: 'short', timeStyle: 'short' })
export const when = (iso) => (iso ? dtf.format(new Date(iso)) : '–')

/** Kurze Meldung unten am Bildschirm. */
export function toast(text, isError = false) {
  const el = document.createElement('div')
  el.className = `toast${isError ? ' toast-error' : ''}`
  el.setAttribute('role', isError ? 'alert' : 'status')
  el.textContent = text
  document.body.append(el)
  setTimeout(() => el.remove(), isError ? 7000 : 3500)
}

/** Ein Produkt-Identifikator aus einem Namen («Geekom A6» → «geekom-a6»). */
export const slug = (s) =>
  String(s)
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/[\s_]+/g, '-')
    .slice(0, 40) || `produkt-${Date.now()}`
