import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Dialog from '../components/Dialog'
import { SearchIcon } from '../components/icons'
import PageFrame from '../components/PageFrame'
import catalog from '../data/trailCatalog.json'
import { db, getSetting, type Trail } from '../lib/db'
import { formatKm } from '../lib/format'
import { cumulativeDistances } from '../lib/geo'
import { loadTrail, type LoadStep } from '../trails/load'
import { NETWORK_LABELS, searchTrails, userNameFilter, type TrailHit } from '../trails/search'

/** Eintrag aus src/data/trailCatalog.json (erzeugt von scripts/build-trail-catalog.mjs). */
interface CatalogTrail {
  id: number
  name: string
  ref: string | null
  network: string | null
  from: string | null
  to: string | null
  countries: string[]
  lengthKm: number | null
  lengthSource: string | null
  text: string
  textSource: string | null
  wikipedia: string | null
  image: { url: string; width: number; height: number; author: string; license: string; licenseUrl: string | null; page: string } | null
}

const TRAILS = catalog.trails as CatalogTrail[]
const PAGE = 24

type Status = { kind: 'idle' } | { kind: 'searching' } | { kind: 'loading'; step: LoadStep; share?: number } | { kind: 'error'; message: string }

/** Wikimedia liefert feste Vorschaubreiten; für die Liste reicht die kleinere. */
const smallImage = (url: string) => url.replace('/960px-', '/500px-')

const facts = (t: CatalogTrail) =>
  [t.countries.slice(0, 3).join(', ') + (t.countries.length > 3 ? ' …' : ''), t.lengthKm ? `ca. ${t.lengthKm} km` : null].filter(Boolean).join(' · ')

/** Suchgebiet für die OSM-Suche: rund um die letzte Kartenansicht. */
async function searchArea(): Promise<[number, number, number, number]> {
  const v = await getSetting<{ center: [number, number] }>('map.view', { center: [8.2, 46.8] })
  const [lng, lat] = v.center
  return [lng - 4, lat - 3, lng + 4, lat + 3]
}

function Credit({ image }: { image: NonNullable<CatalogTrail['image']> }) {
  return (
    <p className="label truncate text-[9px]! normal-case! tracking-normal! text-muted">
      Foto:{' '}
      <a href={image.page} target="_blank" rel="noopener" className="underline" onClick={(e) => e.stopPropagation()}>
        {image.author}
      </a>
      , {image.license}
    </p>
  )
}

export default function TrailsPage() {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [country, setCountry] = useState<string | null>(null)
  const [shown, setShown] = useState(PAGE)
  const [detail, setDetail] = useState<CatalogTrail | null>(null)
  const [hits, setHits] = useState<TrailHit[] | null>(null)
  const [status, setStatus] = useState<Status>({ kind: 'idle' })
  const [saved, setSaved] = useState<Trail[]>([])
  const ctrl = useRef<AbortController | null>(null)
  const more = useRef<HTMLDivElement>(null)

  useEffect(() => {
    void db.trails.toArray().then(setSaved)
    return () => ctrl.current?.abort()
  }, [])

  const countries = useMemo(() => {
    const count = new Map<string, number>()
    for (const t of TRAILS) for (const c of t.countries) count.set(c, (count.get(c) ?? 0) + 1)
    return [...count.entries()].sort((a, b) => b[1] - a[1]).map(([c]) => c)
  }, [])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return TRAILS.filter(
      (t) =>
        (!country || t.countries.includes(country)) &&
        (!q || t.name.toLowerCase().includes(q) || (t.ref ?? '').toLowerCase().includes(q) || t.countries.some((c) => c.toLowerCase().includes(q))),
    )
  }, [query, country])

  useEffect(() => setShown(PAGE), [query, country])

  // Weitere Einträge nachladen, sobald das Listenende in Sicht kommt
  useEffect(() => {
    const el = more.current
    if (!el) return
    const io = new IntersectionObserver((entries) => entries[0].isIntersecting && setShown((n) => n + PAGE), { rootMargin: '600px' })
    io.observe(el)
    return () => io.disconnect()
  }, [filtered])

  const open = async (hit: Pick<TrailHit, 'id' | 'name' | 'ref' | 'network'>) => {
    ctrl.current?.abort()
    ctrl.current = new AbortController()
    try {
      const trail = await loadTrail(
        { id: hit.id, name: hit.name, ref: hit.ref, network: hit.network },
        (step, share) => setStatus({ kind: 'loading', step, share }),
        ctrl.current.signal,
      )
      setStatus({ kind: 'idle' })
      navigate(`/?trail=${trail.id}`)
    } catch (e) {
      if (!ctrl.current.signal.aborted) setStatus({ kind: 'error', message: (e as Error).message })
    }
  }

  const searchOsm = async () => {
    if (query.trim().length < 3) return
    ctrl.current?.abort()
    ctrl.current = new AbortController()
    setHits(null)
    setStatus({ kind: 'searching' })
    try {
      setHits(await searchTrails(userNameFilter(query), await searchArea(), ctrl.current.signal))
      setStatus({ kind: 'idle' })
    } catch (e) {
      if (!ctrl.current.signal.aborted) setStatus({ kind: 'error', message: (e as Error).message })
    }
  }

  const statusLine = (
    <>
      {status.kind === 'searching' && <p role="status" className="label mt-3 text-muted">Suche in OpenStreetMap …</p>}
      {status.kind === 'loading' && (
        <p role="status" className="card mt-3 p-3 text-sm">
          {status.step === 'osm'
            ? 'Der Weg wird aus OpenStreetMap geladen. Bei langen Wegen kann das eine Minute dauern …'
            : `Höhen werden ergänzt … ${Math.round((status.share ?? 0) * 100)} %`}
        </p>
      )}
      {status.kind === 'error' && (
        <p role="alert" className="card mt-3 border-danger! p-3 text-sm text-danger">
          {status.message}
        </p>
      )}
    </>
  )

  return (
    <PageFrame
      sheet="02"
      title="Fernwege"
      meta={TRAILS.length ? `${TRAILS.length} Wege · Stand ${catalog.generatedAt}` : undefined}
      intro="Markierte Fernwanderwege in Europa. Wähle einen Weg, öffne ihn auf der Karte und teile ihn in Etappen."
    >
      {saved.length > 0 && (
        <section className="mb-6">
          <h2 className="label text-muted">Bereits geladen (auch offline)</h2>
          <ul className="mt-2 divide-y divide-line border-y border-line">
            {saved.map((t) => (
              <li key={t.id}>
                <button type="button" onClick={() => navigate(`/?trail=${t.id}`)} className="flex min-h-13 w-full items-center justify-between gap-3 py-2 text-left">
                  <span className="min-w-0">
                    <span className="block truncate font-semibold">{t.name}</span>
                    {t.gaps > 0 && <span className="block text-xs text-mark">{t.gaps} Lücken in den OSM-Daten: Distanz und Etappen sind ungenau.</span>}
                  </span>
                  <span className="tabular shrink-0 text-sm text-muted">{formatKm(cumulativeDistances(t.points).at(-1) ?? 0)}</span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <form
        className="panel flex items-center focus-within:outline-2 focus-within:outline-mark"
        onSubmit={(e) => {
          e.preventDefault()
          void searchOsm()
        }}
      >
        <SearchIcon className="ml-3 shrink-0 text-muted" />
        <input
          type="search"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setHits(null)
          }}
          placeholder="Weg oder Land suchen"
          aria-label="Fernweg suchen"
          className="min-h-12 w-full bg-transparent px-3 text-base outline-none focus-visible:outline-none"
        />
      </form>

      {countries.length > 0 && (
        <div className="-mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-1" role="group" aria-label="Land">
          <button type="button" aria-pressed={!country} onClick={() => setCountry(null)} className={`btn btn-sm shrink-0 ${!country ? 'btn-primary' : 'btn-quiet'}`}>
            Alle
          </button>
          {countries.slice(0, 24).map((c) => (
            <button key={c} type="button" aria-pressed={country === c} onClick={() => setCountry(country === c ? null : c)} className={`btn btn-sm shrink-0 ${country === c ? 'btn-primary' : 'btn-quiet'}`}>
              {c}
            </button>
          ))}
        </div>
      )}

      {!detail && statusLine}

      <ul className="mt-4 grid gap-4 sm:grid-cols-2">
        {filtered.slice(0, shown).map((t) => (
          <li key={t.id}>
            <button type="button" onClick={() => setDetail(t)} className="card block h-full w-full overflow-hidden text-left">
              {t.image && (
                <img
                  src={smallImage(t.image.url)}
                  alt=""
                  loading="lazy"
                  decoding="async"
                  width={t.image.width}
                  height={t.image.height}
                  className="aspect-[16/10] w-full border-b border-line bg-surface-2 object-cover"
                />
              )}
              <div className="p-3">
                <p className="label text-[10px]! text-green-5">{facts(t) || 'Fernweg'}</p>
                <h2 className="mt-1 text-lg leading-tight font-bold">{t.name}</h2>
                {t.text && <p className="mt-1 line-clamp-3 text-sm text-muted">{t.text}</p>}
                {t.image && (
                  <div className="mt-2">
                    <Credit image={t.image} />
                  </div>
                )}
              </div>
            </button>
          </li>
        ))}
      </ul>
      <div ref={more} />

      {/* Weg nicht im Katalog: direkt in OpenStreetMap suchen */}
      {query.trim().length >= 3 && (
        <section className="mt-6 border-t border-line pt-4">
          <p className="text-sm text-muted">
            {filtered.length === 0 ? 'Kein Treffer im Katalog.' : 'Nicht dabei?'} Suche den Weg direkt in OpenStreetMap, im Gebiet der aktuellen
            Kartenansicht.
          </p>
          <button type="button" onClick={() => void searchOsm()} className="btn mt-2">
            In OpenStreetMap suchen
          </button>
          {hits && hits.length === 0 && <p className="mt-2 text-sm text-muted">Keine markierten Wege mit diesem Namen gefunden.</p>}
          <ul className="mt-2 divide-y divide-line">
            {hits?.map((h) => (
              <li key={h.id}>
                <button type="button" onClick={() => void open(h)} disabled={status.kind === 'loading'} className="block min-h-13 w-full py-2 text-left">
                  <span className="block font-semibold">{h.name}</span>
                  <span className="block text-sm text-muted">
                    {[h.ref, h.network && NETWORK_LABELS[h.network], h.from && h.to && `${h.from} → ${h.to}`].filter(Boolean).join(' · ')}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <p className="mt-8 text-xs text-muted">
        Wege: © OpenStreetMap-Mitwirkende. Namen, Längen und Länder: Wikidata (CC0). Beschreibungen: Wikipedia (CC BY-SA 4.0). Fotos:
        Wikimedia Commons, Urheber und Lizenz stehen beim Bild. Längenangaben stammen aus diesen Quellen; die genaue Länge zeigt die Karte
        nach dem Laden.
      </p>

      {detail && (
        <Dialog title={facts(detail) || 'Fernweg'} onClose={() => setDetail(null)}>
          {detail.image && (
            <figure>
              <img src={detail.image.url} alt="" width={detail.image.width} height={detail.image.height} className="max-h-[42vh] w-full border border-line bg-surface-2 object-cover" />
              <figcaption className="mt-1">
                <Credit image={detail.image} />
              </figcaption>
            </figure>
          )}
          <h2 className="wordmark mt-3 text-2xl">{detail.name}</h2>
          <dl className="tabular mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-sm">
            {detail.lengthKm && (
              <>
                <dt className="text-muted">Länge laut {detail.lengthSource}</dt>
                <dd>ca. {detail.lengthKm} km</dd>
              </>
            )}
            {detail.from && detail.to && (
              <>
                <dt className="text-muted">Verlauf</dt>
                <dd>
                  {detail.from} → {detail.to}
                </dd>
              </>
            )}
            {detail.ref && (
              <>
                <dt className="text-muted">Kürzel</dt>
                <dd>{detail.ref}</dd>
              </>
            )}
          </dl>
          {detail.text && <p className="mt-3 text-sm">{detail.text}</p>}
          {detail.wikipedia && (
            <p className="mt-1 text-xs text-muted">
              {detail.textSource === 'Wikipedia' ? 'Text: ' : 'Mehr dazu: '}
              <a href={detail.wikipedia} target="_blank" rel="noopener" className="underline">
                Wikipedia
              </a>
              {detail.textSource === 'Wikipedia' && ' (CC BY-SA 4.0)'}
            </p>
          )}
          {statusLine}
          <button type="button" onClick={() => void open({ id: detail.id, name: detail.name, ref: detail.ref ?? undefined, network: detail.network ?? undefined })} disabled={status.kind === 'loading'} className="btn btn-primary mt-4 min-h-14 w-full text-[13px]">
            Auf der Karte öffnen
          </button>
        </Dialog>
      )}
    </PageFrame>
  )
}
