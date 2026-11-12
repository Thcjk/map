// Baut den Fernweg-Katalog (src/data/trailCatalog.json) aus freien Quellen:
//   1. OpenStreetMap (Overpass API): Wander-Routenrelationen mit Wikidata-Verweis
//   2. Wikidata (CC0): Name, Kurzbeschreibung, Länge, Länder, Bild, OSM-Relation
//   3. Wikimedia Commons: Bild-URL, Urheber, Lizenz (nur freie Lizenzen)
//   4. Wikipedia (CC BY-SA): Einleitungssatz als Beschreibung
// Läuft in GitHub Actions (.github/workflows/trail-catalog.yml), ohne Abhängigkeiten.
// Nichts wird geraten: Ein Weg kommt nur in den Katalog, wenn seine OSM-Relation eindeutig ist.
import { writeFile } from 'node:fs/promises'

const UA = 'trail-catalog-builder/1.0 (GitHub Actions; hiking app catalog)'
const OUT = new URL('../src/data/trailCatalog.json', import.meta.url)
const MAX_TRAILS = 600
// Reihenfolge nach Erfahrung aus den Läufen: der erste antwortete zuverlässig in unter einer Minute.
const OVERPASS = [
  'https://maps.mail.ru/osm/tools/overpass/api/interpreter',
  'https://overpass.private.coffee/api/interpreter',
  'https://overpass-api.de/api/interpreter',
]
const OVERPASS_TIMEOUT_MS = 120_000
const FREE_LICENSE = /^(cc0|cc[ -]by(-sa)?[ -]\d|public domain|pd\b|pdm)/i

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function getJson(url, init = {}, tries = 8) {
  for (let i = 1; ; i++) {
    try {
      const res = await fetch(url, {
        signal: AbortSignal.timeout(60_000),
        ...init,
        headers: { 'User-Agent': UA, Accept: 'application/json', ...(init.headers ?? {}) },
      })
      if (res.status === 429 || res.status === 503) {
        // Wikimedia bremst: so lange warten, wie der Server verlangt
        const wait = Math.min(120, Number(res.headers.get('retry-after')) || 10 * i)
        if (i >= tries) throw new Error(`HTTP ${res.status}`)
        console.log(`Gebremst (${res.status}), warte ${wait} s …`)
        await sleep(wait * 1000)
        continue
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json = await res.json()
      // Wikidata meldet Überlastung (maxlag) mit HTTP 200: warten und erneut versuchen
      if (json?.error?.code === 'maxlag') {
        if (i >= tries) throw new Error('maxlag')
        await sleep((Number(res.headers.get('retry-after')) || 5) * 1000)
        continue
      }
      return json
    } catch (e) {
      if (i >= tries) throw new Error(`${url.slice(0, 90)}: ${e.message}`)
      await sleep(2000 * i)
    }
  }
}

const chunks = (arr, n) => Array.from({ length: Math.ceil(arr.length / n) }, (_, i) => arr.slice(i * n, i * n + n))

// ---------- 1. OpenStreetMap ----------
async function overpass(query) {
  let last
  for (let round = 0; round < 1; round++) {
    for (const url of OVERPASS) {
      try {
        const json = await getJson(url, { method: 'POST', body: new URLSearchParams({ data: query }), signal: AbortSignal.timeout(OVERPASS_TIMEOUT_MS) }, 1)
        if (json.remark) console.log('Overpass-Hinweis:', json.remark)
        return json.elements
      } catch (e) {
        last = e
        console.log('Overpass-Fehler, nächster Server:', e.message)
        await sleep(5000)
      }
    }
  }
  throw last
}

// Internationale Wege weltweit in einer Abfrage (klein genug). Nationale und regionale Wege
// sind zu viele für eine Abfrage: Europa in Kacheln aufteilen. Fällt eine Kachel aus, fehlen nur
// deren Wege; der Katalog wird trotzdem gebaut (nur ohne iwn bricht das Skript ab).
const EUROPE_TILES = []
for (const [s, n] of [
  [34, 44],
  [44, 50],
  [50, 56],
  [56, 72],
])
  for (const [w, e] of [
    [-25, 0],
    [0, 10],
    [10, 20],
    [20, 45],
  ])
    EUROPE_TILES.push(`${s},${w},${n},${e}`)

const QUERIES = [
  { label: 'hiking/iwn', filter: '["route"="hiking"]["network"="iwn"]', required: true },
  { label: 'foot/iwn', filter: '["route"="foot"]["network"="iwn"]' },
  ...EUROPE_TILES.flatMap((bbox) => [
    { label: `hiking/nwn ${bbox}`, filter: '["route"="hiking"]["network"="nwn"]', bbox },
    { label: `hiking/rwn ${bbox}`, filter: '["route"="hiking"]["network"="rwn"]', bbox },
  ]),
]
const byId = new Map()
const failed = []
// Höchstens 25 Minuten für OSM: Was bis dahin nicht kam, fehlt diesmal (nächster Lauf holt es).
const OSM_DEADLINE = Date.now() + 25 * 60_000
for (const q of QUERIES) {
  if (!q.required && Date.now() > OSM_DEADLINE) {
    failed.push(`${q.label} (Zeit)`)
    continue
  }
  try {
    const found = await overpass(`[out:json][timeout:110];relation${q.filter}["wikidata"]${q.bbox ? `(${q.bbox})` : ''};out tags;`)
    console.log(`OSM ${q.label}:`, found.length)
    for (const r of found) byId.set(r.id, r)
  } catch (e) {
    if (q.required) throw e
    failed.push(q.label)
    console.log(`OSM ${q.label} ausgelassen:`, e.message)
  }
  await sleep(4000)
}
if (failed.length) console.log('Ausgelassene Abfragen:', failed.join(' · '))
const relations = [...byId.values()]
console.log('OSM-Relationen mit Wikidata-Verweis:', relations.length)

/** QID -> Relationen */
const groups = new Map()
for (const r of relations) {
  const qid = r.tags.wikidata.split(';')[0].trim()
  if (!/^Q\d+$/.test(qid)) continue
  if (!groups.has(qid)) groups.set(qid, [])
  groups.get(qid).push(r)
}
console.log('Verschiedene Wikidata-Objekte:', groups.size)

// ---------- 2. Wikidata ----------
const entities = new Map()
for (const ids of chunks([...groups.keys()], 50)) {
  const json = await getJson(
    `https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&props=labels|descriptions|claims|sitelinks&languages=de|en&ids=${ids.join('|')}&maxlag=5`,
  )
  for (const [id, e] of Object.entries(json.entities ?? {})) if (!e.missing) entities.set(id, e)
  if (entities.size % 500 < 50) console.log('Wikidata …', entities.size)
  await sleep(1000)
}
console.log('Wikidata-Objekte geladen:', entities.size, new Date().toISOString())

const claimValues = (e, p) =>
  (e.claims?.[p] ?? []).filter((c) => c.rank !== 'deprecated' && c.mainsnak?.datavalue).map((c) => c.mainsnak.datavalue.value)

const UNIT_TO_KM = { Q828224: 1, Q11573: 0.001, Q253276: 1.609344 }
function lengthKm(e, tags) {
  for (const v of claimValues(e, 'P2043')) {
    const factor = UNIT_TO_KM[v.unit?.split('/').pop()]
    const n = Number(v.amount)
    if (factor && n > 0) return { km: Math.round(n * factor), source: 'Wikidata' }
  }
  const m = /^\s*([\d.,]+)\s*(km|mi|miles)?\s*$/i.exec(tags.distance ?? '')
  if (m) {
    const n = Number(m[1].replace(',', '.'))
    if (n > 0) return { km: Math.round(n * (m[2] && m[2].toLowerCase().startsWith('mi') ? 1.609344 : 1)), source: 'OpenStreetMap' }
  }
  return null
}

/** Staaten in Europa (Wikidata-IDs), dazu die Landesteile des Vereinigten Königreichs. */
const EUROPE = new Set(
  'Q39 Q183 Q142 Q38 Q40 Q29 Q45 Q145 Q27 Q31 Q55 Q32 Q347 Q35 Q34 Q20 Q33 Q189 Q36 Q213 Q214 Q28 Q215 Q224 Q225 Q403 Q236 Q222 Q221 Q41 Q219 Q218 Q217 Q212 Q184 Q211 Q37 Q191 Q235 Q238 Q228 Q233 Q229 Q1246 Q21 Q22 Q25 Q26 Q237'.split(' '),
)
function inEurope(e) {
  const countries = claimValues(e, 'P17').map((v) => v.id)
  if (countries.length) return countries.some((c) => EUROPE.has(c))
  const coord = claimValues(e, 'P625')[0]
  return !!coord && coord.latitude > 34 && coord.latitude < 72 && coord.longitude > -25 && coord.longitude < 45
}

const candidates = []
let ambiguous = 0
for (const [qid, rels] of groups) {
  const e = entities.get(qid)
  if (!e || !inEurope(e)) continue
  // Eindeutige Haupt-Relation bestimmen
  const p402 = new Set(claimValues(e, 'P402').map(String))
  let root = rels.find((r) => p402.has(String(r.id)))
  if (!root && rels.length === 1) root = rels[0]
  if (!root) {
    const supers = rels.filter((r) => r.tags.type === 'superroute')
    if (supers.length === 1) root = supers[0]
  }
  if (!root) {
    ambiguous++
    continue
  }
  const links = Object.keys(e.sitelinks ?? {}).filter((k) => k.endsWith('wiki') && k !== 'commonswiki').length
  const image = claimValues(e, 'P18')[0]
  if (links === 0 && !image) continue
  const t = root.tags
  candidates.push({
    id: root.id,
    wikidata: qid,
    name: e.labels?.de?.value ?? t['name:de'] ?? t.name ?? e.labels?.en?.value,
    ref: t.ref,
    network: t.network,
    from: t.from,
    to: t.to,
    length: lengthKm(e, t),
    countryIds: claimValues(e, 'P17').map((v) => v.id).filter((id) => EUROPE.has(id)),
    description: e.descriptions?.de?.value ?? '',
    dewiki: e.sitelinks?.dewiki?.title,
    enwiki: e.sitelinks?.enwiki?.title,
    imageFile: typeof image === 'string' ? image : undefined,
    links,
  })
}
console.log('Mehrdeutig (übersprungen):', ambiguous, '· Kandidaten:', candidates.length)

candidates.sort((a, b) => b.links - a.links || (b.imageFile ? 1 : 0) - (a.imageFile ? 1 : 0))
const selected = candidates.filter((c) => c.name).slice(0, MAX_TRAILS)

// Ländernamen
const countryNames = new Map()
for (const ids of chunks([...new Set(selected.flatMap((c) => c.countryIds))], 50)) {
  const json = await getJson(`https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&props=labels&languages=de&ids=${ids.join('|')}`)
  for (const [id, e] of Object.entries(json.entities ?? {})) if (e.labels?.de) countryNames.set(id, e.labels.de.value)
  await sleep(1000)
}

// ---------- 3. Wikimedia Commons ----------
const stripHtml = (s) =>
  s
    .replace(/<[^>]*>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim()

const images = new Map()
for (const files of chunks([...new Set(selected.map((c) => c.imageFile).filter(Boolean))], 40)) {
  const titles = files.map((f) => `File:${f}`).join('|')
  const json = await getJson(
    `https://commons.wikimedia.org/w/api.php?action=query&format=json&prop=imageinfo&iiprop=url|extmetadata&iiurlwidth=960&titles=${encodeURIComponent(titles)}`,
  )
  const normalized = new Map((json.query?.normalized ?? []).map((n) => [n.to, n.from]))
  for (const page of Object.values(json.query?.pages ?? {})) {
    const info = page.imageinfo?.[0]
    if (!info?.thumburl) continue
    const meta = info.extmetadata ?? {}
    const license = stripHtml(meta.LicenseShortName?.value ?? '')
    const author = stripHtml(meta.Artist?.value ?? '').slice(0, 90)
    if (!FREE_LICENSE.test(license)) continue
    const needsAuthor = !/^(cc0|public domain|pd\b|pdm)/i.test(license)
    if (needsAuthor && !author) continue
    const file = (normalized.get(page.title) ?? page.title).replace(/^File:/, '')
    images.set(file, {
      url: info.thumburl,
      width: info.thumbwidth,
      height: info.thumbheight,
      author: author || 'gemeinfrei',
      license,
      licenseUrl: meta.LicenseUrl?.value ?? null,
      page: info.descriptionurl,
    })
  }
  await sleep(1000)
}
console.log('Bilder mit freier Lizenz:', images.size)

// ---------- 4. Wikipedia (Einleitung, deutsch) ----------
const extracts = new Map()
for (const titles of chunks(selected.map((c) => c.dewiki).filter(Boolean), 20)) {
  const json = await getJson(
    `https://de.wikipedia.org/w/api.php?action=query&format=json&prop=extracts&exintro=1&explaintext=1&exsentences=2&exlimit=20&redirects=1&titles=${encodeURIComponent(titles.join('|'))}`,
  )
  const back = new Map()
  for (const n of [...(json.query?.normalized ?? []), ...(json.query?.redirects ?? [])]) back.set(n.to, back.get(n.from) ?? n.from)
  for (const page of Object.values(json.query?.pages ?? {})) {
    if (page.extract) extracts.set(back.get(page.title) ?? page.title, page.extract.replace(/\s+/g, ' ').trim())
  }
  await sleep(1000)
}
console.log('Wikipedia-Einleitungen:', extracts.size)

const shorten = (s, max = 340) => {
  if (s.length <= max) return s
  const cut = s.slice(0, max)
  const end = Math.max(cut.lastIndexOf('. '), cut.lastIndexOf('! '))
  return end > 120 ? cut.slice(0, end + 1) : `${cut.slice(0, cut.lastIndexOf(' '))} …`
}

const trails = selected.map((c) => {
  const extract = c.dewiki && extracts.get(c.dewiki)
  const wiki = c.dewiki
    ? `https://de.wikipedia.org/wiki/${encodeURIComponent(c.dewiki.replace(/ /g, '_'))}`
    : c.enwiki
      ? `https://en.wikipedia.org/wiki/${encodeURIComponent(c.enwiki.replace(/ /g, '_'))}`
      : null
  return {
    id: c.id,
    wikidata: c.wikidata,
    name: c.name,
    ref: c.ref ?? null,
    network: c.network ?? null,
    from: c.from ?? null,
    to: c.to ?? null,
    countries: c.countryIds.map((id) => countryNames.get(id)).filter(Boolean),
    lengthKm: c.length?.km ?? null,
    lengthSource: c.length?.source ?? null,
    text: extract ? shorten(extract) : c.description,
    textSource: extract ? 'Wikipedia' : c.description ? 'Wikidata' : null,
    wikipedia: wiki,
    image: (c.imageFile && images.get(c.imageFile)) ?? null,
    links: c.links,
  }
})

await writeFile(OUT, JSON.stringify({ generatedAt: new Date().toISOString().slice(0, 10), trails }, null, 1) + '\n')
console.log(`Geschrieben: ${trails.length} Wege, davon ${trails.filter((t) => t.image).length} mit Foto.`)
console.log('Top 15:', trails.slice(0, 15).map((t) => `${t.name} (${t.links})`).join(' · '))
