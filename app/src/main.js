// Deal-Radar: Einstieg der App. Lädt die JSON-Dateien aus dem Repo und zeigt die Seiten an.
// Seiten werden über den Teil nach «#» in der Adresse gewählt (#/, #/p/<id>, #/neu, #/einstellungen).
import './style.css'
import { evaluate, VERDICT_LABELS } from '../../shared/rules.js'
import { drawHistory } from './chart.js'
import { DATA_FILES } from './config.js'
import { SORTS, summarize } from './deals.js'
import { getToken, loadJson, runWorkflow, saveJson, setToken } from './github.js'
import { chf, esc, slug, toast, when } from './ui.js'

const app = document.querySelector('#app')
const state = { data: null, error: null, sort: localStorage.getItem('deal-radar.sort') || 'discount' }

async function loadAll() {
  try {
    const entries = await Promise.all(DATA_FILES.map(async (n) => [n, await loadJson(n)]))
    state.data = Object.fromEntries(entries)
    state.error = null
  } catch (e) {
    state.error = e.message
  }
  render()
}

const VERDICT_CLASS = { good: 'good', check: 'check', bad: 'bad' }
const availabilityText = (a) => (a === true ? 'verfügbar' : a === false ? 'nicht verfügbar' : 'Verfügbarkeit unbekannt')

function verdictFor(item, p) {
  if (!p?.specsText) return null
  return evaluate({ text: p.specsText, price: p.current?.price, strikePrice: p.current?.strikePrice, history: p.history, category: item.category }, state.data.rules)
}

// ---------- Seiten ----------

function dashboard() {
  const { wishlist, prices } = state.data
  const rows = wishlist.products.map((item) => ({ item, p: prices.products[item.id], s: summarize(item, prices.products[item.id]) }))
  rows.sort(SORTS[state.sort].fn)
  return `
    <header class="bar">
      <h1>Deal-Radar</h1>
      <a class="btn btn-quiet" href="#/einstellungen" aria-label="Einstellungen">⚙︎</a>
    </header>
    <p class="meta">Zuletzt geprüft: ${when(prices.updatedAt)} · Takt: alle ${state.data.settings.intervalHours} h</p>
    <div class="toolbar">
      <label>Sortieren
        <select id="sort">${Object.entries(SORTS).map(([k, v]) => `<option value="${k}" ${k === state.sort ? 'selected' : ''}>${v.label}</option>`).join('')}</select>
      </label>
      <button class="btn" id="check-now" type="button">Jetzt prüfen</button>
    </div>
    <ul class="list">
      ${rows
        .map(({ item, p, s }) => {
          const v = verdictFor(item, p)
          return `
        <li>
          <a class="card" href="#/p/${encodeURIComponent(item.id)}">
            <div class="card-head">
              <h2>${esc(item.name)}</h2>
              ${s.bargain ? '<span class="badge badge-deal">Schnäppchen</span>' : ''}
            </div>
            ${p?.matchedName ? `<p class="small muted">${esc(p.shop)}: ${esc(p.matchedName)}</p>` : ''}
            <div class="prices">
              <div><span class="label">Aktuell</span><strong class="price">${chf(s.price)}</strong></div>
              <div><span class="label">Ziel</span><span>${chf(item.targetPrice)}</span></div>
              <div><span class="label">Tiefst</span><span>${chf(s.lowest)}</span></div>
              <div><span class="label">Rabatt</span><span>${s.discount > 0 ? `−${s.discount} %` : '–'}</span></div>
            </div>
            <p class="small">
              ${s.status === 'ok' || s.status === 'manual' ? `<span class="${s.available === false ? 'warn' : 'muted'}">${availabilityText(s.available)}</span>` : ''}
              ${s.toTarget != null && s.toTarget > 0 ? ` · noch ${chf(s.toTarget)} über Ziel` : ''}
              ${v ? ` · <span class="verdict-inline ${VERDICT_CLASS[v.verdict]}">${VERDICT_LABELS[v.verdict]}</span>` : ''}
            </p>
            ${p?.error ? `<p class="small warn">${esc(p.error)}</p>` : ''}
            ${!p ? '<p class="small muted">Noch nicht geprüft.</p>' : ''}
          </a>
        </li>`
        })
        .join('')}
    </ul>
    <a class="btn btn-primary btn-block" href="#/neu">+ Produkt hinzufügen</a>
  `
}

function productPage(id) {
  const { wishlist, prices } = state.data
  const item = wishlist.products.find((x) => x.id === id)
  if (!item) return `<p>Produkt nicht gefunden. <a href="#/">Zur Übersicht</a></p>`
  const p = prices.products[id]
  const s = summarize(item, p)
  const v = verdictFor(item, p)
  return `
    <header class="bar"><a class="btn btn-quiet" href="#/" aria-label="Zurück">←</a><h1 class="h-small">${esc(item.name)}</h1></header>
    ${p?.matchedName ? `<p class="muted">${esc(p.shop)}: ${p.url ? `<a href="${esc(p.url)}" target="_blank" rel="noopener">${esc(p.matchedName)}</a>` : esc(p.matchedName)}</p>` : ''}
    <div class="prices big">
      <div><span class="label">Aktuell</span><strong class="price">${chf(s.price)}</strong></div>
      <div><span class="label">Tiefst</span><span>${chf(s.lowest)}</span><span class="small muted">${p?.lowest ? when(p.lowest.at) : ''}</span></div>
      <div><span class="label">Ziel</span><span>${chf(item.targetPrice)}</span></div>
    </div>
    ${p?.current?.strikePrice ? `<p class="small">Shop zeigt «statt ${chf(p.current.strikePrice)}».</p>` : ''}
    <p class="small ${s.available === false ? 'warn' : 'muted'}">${availabilityText(s.available)} · geprüft ${when(p?.checkedAt)}</p>
    ${p?.error ? `<p class="notice">${esc(p.error)}</p>` : ''}

    <section class="panel"><h2>Preisverlauf</h2><div class="chart"><canvas id="chart" aria-label="Preisverlauf"></canvas></div>
      ${(p?.history?.length ?? 0) < 2 ? '<p class="small muted">Der Verlauf füllt sich mit jeder Prüfung.</p>' : ''}</section>

    ${v ? `<section class="panel"><h2>Deal-Check <span class="verdict ${VERDICT_CLASS[v.verdict]}">${VERDICT_LABELS[v.verdict]}</span></h2>
      <ul class="reasons">${v.reasons.map((r) => `<li class="${VERDICT_CLASS[r.level]}">${esc(r.text)}</li>`).join('')}</ul>
      <p class="small muted">Beurteilt nach deinen Regeln aus den Produktangaben des Shops. Angaben ohne Gewähr.</p></section>` : ''}

    <section class="panel">
      <h2>Bearbeiten</h2>
      <form id="edit" class="form">
        <label>Zielpreis (CHF)<input name="targetPrice" type="number" step="1" min="1" value="${item.targetPrice ?? ''}" required></label>
        <label>Produktlink<input name="url" type="url" value="${esc(item.url ?? '')}" placeholder="https://www.digitec.ch/…"></label>
        <label>Suchbegriff (falls kein Link)<input name="query" value="${esc(item.query ?? '')}"></label>
        <button class="btn btn-primary" type="submit">Speichern</button>
      </form>
      <form id="manual" class="form">
        <p class="small muted">Preis von Hand eintragen (für Shops, die automatische Abfragen sperren). Die nächste Prüfung übernimmt ihn.</p>
        <label>Preis (CHF)<input name="price" type="number" step="0.05" min="0" required></label>
        <label class="check"><input name="available" type="checkbox" checked> verfügbar</label>
        <button class="btn" type="submit">Preis eintragen</button>
      </form>
      <button class="btn btn-danger" id="delete" type="button">Von der Wunschliste entfernen</button>
    </section>
  `
}

function addPage() {
  return `
    <header class="bar"><a class="btn btn-quiet" href="#/" aria-label="Zurück">←</a><h1 class="h-small">Produkt hinzufügen</h1></header>
    <form id="add" class="form panel">
      <label>Produktlink<input name="url" type="url" placeholder="https://www.digitec.ch/de/s1/product/…" required></label>
      <p class="small muted">Digitec und Galaxus werden automatisch geprüft. Bei Brack, Conrad, MediaMarkt, Interdiscount und Amazon sperren die Shops automatische Abfragen: Dort trägst du den Preis von Hand ein.</p>
      <label>Name<input name="name" placeholder="z. B. Beelink SER8 32 GB" required></label>
      <label>Art<select name="category"><option value="miniPc">Mini-PC</option><option value="monitor">Monitor</option><option value="other">Anderes</option></select></label>
      <label>Zielpreis (CHF)<input name="targetPrice" type="number" step="1" min="1" required></label>
      <button class="btn btn-primary" type="submit">Hinzufügen</button>
    </form>
  `
}

function settingsPage() {
  const { settings, rules } = state.data
  return `
    <header class="bar"><a class="btn btn-quiet" href="#/" aria-label="Zurück">←</a><h1 class="h-small">Einstellungen</h1></header>
    <section class="panel">
      <h2>GitHub-Token</h2>
      <p class="small">Damit die App Änderungen speichern und Prüfungen starten kann. Er bleibt nur auf diesem Gerät.
        Anleitung: siehe README im Repo.</p>
      <form id="token" class="form">
        <label>Token<input name="token" type="password" autocomplete="off" value="${getToken() ? '••••••••' : ''}" placeholder="github_pat_…"></label>
        <div class="row"><button class="btn btn-primary" type="submit">Speichern</button><button class="btn" id="token-clear" type="button">Entfernen</button></div>
      </form>
    </section>
    <section class="panel">
      <h2>Prüftakt</h2>
      <div class="segmented" role="radiogroup" aria-label="Prüftakt">
        ${[6, 3, 1].map((h) => `<button type="button" role="radio" aria-checked="${settings.intervalHours === h}" data-interval="${h}">${h === 1 ? 'stündlich' : `alle ${h} h`}</button>`).join('')}
      </div>
      <p class="small muted">Rund um Black Friday (27. November) lohnt sich «stündlich».</p>
    </section>
    <section class="panel">
      <h2>Kaufregeln</h2>
      <p class="small muted">Deine Regeln für den Deal-Check (Datei data/rules.json). Vorsicht beim Bearbeiten: Es muss gültiges JSON bleiben.</p>
      <form id="rules" class="form"><textarea name="rules" rows="16" spellcheck="false">${esc(JSON.stringify(rules, null, 2))}</textarea>
        <button class="btn btn-primary" type="submit">Regeln speichern</button></form>
    </section>
  `
}

// ---------- Aktionen ----------

async function save(name, data, message, okText) {
  try {
    await saveJson(name, data, message)
    toast(okText)
    render()
  } catch (e) {
    toast(e.message, true)
  }
}

function bind(route) {
  const on = (sel, ev, fn) => document.querySelector(sel)?.addEventListener(ev, fn)
  const { data } = state

  on('#sort', 'change', (e) => {
    state.sort = e.target.value
    localStorage.setItem('deal-radar.sort', state.sort)
    render()
  })
  on('#check-now', 'click', async () => {
    try {
      await runWorkflow('check-prices.yml', { force: 'true' })
      toast('Prüfung gestartet. Ergebnisse in etwa 1–2 Minuten (Seite dann neu laden).')
    } catch (e) {
      toast(e.message, true)
    }
  })

  if (route.page === 'product') {
    const item = data.wishlist.products.find((x) => x.id === route.id)
    const p = data.prices.products[route.id]
    if (p?.history?.length) drawHistory(document.querySelector('#chart'), p.history, item?.targetPrice)
    on('#edit', 'submit', (e) => {
      e.preventDefault()
      const f = new FormData(e.target)
      item.targetPrice = Number(f.get('targetPrice'))
      const url = String(f.get('url')).trim() || null
      if (url !== item.url) delete item.productId // neue Adresse: Produkt neu zuordnen
      item.url = url
      item.query = String(f.get('query')).trim() || item.name
      save('wishlist', data.wishlist, `Wunschliste: ${item.name} geändert`, 'Gespeichert. Wirkt ab der nächsten Prüfung.')
    })
    on('#manual', 'submit', (e) => {
      e.preventDefault()
      const f = new FormData(e.target)
      data.manual.entries[item.id] = { price: Number(f.get('price')), available: f.get('available') === 'on', at: new Date().toISOString() }
      save('manual', data.manual, `Preis von Hand: ${item.name}`, 'Preis eingetragen. Die nächste Prüfung übernimmt ihn.')
    })
    on('#delete', 'click', () => {
      if (!confirm(`«${item.name}» wirklich entfernen?`)) return
      data.wishlist.products = data.wishlist.products.filter((x) => x.id !== item.id)
      location.hash = '#/'
      save('wishlist', data.wishlist, `Wunschliste: ${item.name} entfernt`, 'Entfernt.')
    })
  }

  on('#add', 'submit', (e) => {
    e.preventDefault()
    const f = new FormData(e.target)
    const name = String(f.get('name')).trim()
    let id = slug(name)
    while (data.wishlist.products.some((x) => x.id === id)) id += '-2'
    data.wishlist.products.push({ id, name, category: f.get('category'), query: name, targetPrice: Number(f.get('targetPrice')), url: String(f.get('url')).trim() })
    location.hash = '#/'
    save('wishlist', data.wishlist, `Wunschliste: ${name} hinzugefügt`, 'Hinzugefügt. Starte «Jetzt prüfen» für einen ersten Preis.')
  })

  on('#token', 'submit', (e) => {
    e.preventDefault()
    const t = String(new FormData(e.target).get('token'))
    if (t && !t.startsWith('•')) {
      setToken(t)
      toast('Token gespeichert.')
      loadAll()
    }
  })
  on('#token-clear', 'click', () => {
    setToken('')
    toast('Token entfernt.')
    render()
  })
  document.querySelectorAll('[data-interval]').forEach((b) =>
    b.addEventListener('click', () => {
      data.settings.intervalHours = Number(b.dataset.interval)
      save('settings', data.settings, `Prüftakt: alle ${b.dataset.interval} h`, 'Prüftakt gespeichert.')
    }),
  )
  on('#rules', 'submit', (e) => {
    e.preventDefault()
    try {
      data.rules = JSON.parse(String(new FormData(e.target).get('rules')))
    } catch (err) {
      toast(`Kein gültiges JSON: ${err.message}`, true)
      return
    }
    save('rules', data.rules, 'Kaufregeln geändert', 'Regeln gespeichert.')
  })
}

// ---------- Rahmen ----------

function parseRoute() {
  const h = location.hash.replace(/^#\/?/, '')
  if (h.startsWith('p/')) return { page: 'product', id: decodeURIComponent(h.slice(2)) }
  if (h === 'neu') return { page: 'add' }
  if (h === 'einstellungen') return { page: 'settings' }
  return { page: 'dashboard' }
}

function render() {
  const route = parseRoute()
  if (state.error) {
    app.innerHTML = `<p class="notice">${esc(state.error)}</p><button class="btn" onclick="location.reload()">Neu laden</button>`
    return
  }
  if (!state.data) {
    app.innerHTML = '<p class="muted">Lädt …</p>'
    return
  }
  app.innerHTML = { dashboard, product: () => productPage(route.id), add: addPage, settings: settingsPage }[route.page]()
  bind(route)
  window.scrollTo(0, 0)
}

window.addEventListener('hashchange', render)
render()
loadAll()
