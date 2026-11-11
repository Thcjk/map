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
// Europa (süd, west, nord, ost)
const BBOX = '34,-25,72,45'
const OVERPASS = ['https://overpass-api.de/api/interpreter', 'https://overpass.private.coffee/api/interpreter']
const FREE_LICENSE = /^(cc0|cc[ -]by(-sa)?[ -]\d|public domain|pd\b|pdm)/i

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function getJson(url, init = {}, tries = 4) {
  for (let i = 1; ; i++) {
    try {
      const res = await fetch(url, { ...init, headers: { 'User-Agent': UA, Accept: 'application/json', ...(init.headers ?? {}) } })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      return await res.json()
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
  for (const url of OVERPASS) {
    try {
      const json = await getJson(url, { method: 'POST', body: new URLSearchParams({ data: query }) }, 2)
      if (json.remark) console.log('Overpass-Hinweis:', json.remark)
      return json.elements
    } catch (e) {
      last = e
      console.log('Overpass-Fehler, nächster Server:', e.message)
    }
  }
  throw last
}

const relations = await overpass(
  `[out:json][timeout:600][maxsize:1073741824];relation["route"~"^(hiking|foot)$"]["network"~"^(iwn|nwn|rwn)$"]["wikidata"](${BBOX});out tags;`,
)
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
    `https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&props=labels|descriptions|claims|sitelinks&languages=de|en&ids=${ids.join('|')}`,
  )
  for (const [id, e] of Object.entries(json.entities ?? {})) if (!e.missing) entities.set(id, e)
  await sleep(120)
}
console.log('Wikidata-Objekte geladen:', entities.size)

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

const candidates = []
let ambiguous = 0
for (const [qid, rels] of groups) {
  const e = entities.get(qid)
  if (!e) continue
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
    countryIds: claimValues(e, 'P17').map((v) => v.id),
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
  await sleep(120)
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
  await sleep(150)
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
  await sleep(150)
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
