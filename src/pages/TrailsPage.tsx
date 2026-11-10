import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { SearchIcon } from '../components/icons'
import { db, getSetting, type Trail } from '../lib/db'
import { formatKm } from '../lib/format'
import { CATALOG, type CatalogTrail } from '../trails/catalog'
import { loadTrail, type LoadStep } from '../trails/load'
import { NETWORK_LABELS, searchTrails, userNameFilter, type TrailHit } from '../trails/search'
import { cumulativeDistances } from '../lib/geo'

type Status = { kind: 'idle' } | { kind: 'searching' } | { kind: 'loading'; step: LoadStep; share?: number } | { kind: 'error'; message: string }

/** Suchgebiet für die Freitextsuche: ca. ±3° um die letzte Kartenansicht. */
async function searchArea(): Promise<[number, number, number, number]> {
  const v = await getSetting<{ center: [number, number] }>('map.view', { center: [8.2, 46.8] })
  const [lng, lat] = v.center
  return [lng - 4, lat - 3, lng + 4, lat + 3]
}

export default function TrailsPage() {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [title, setTitle] = useState<string | null>(null)
  const [hits, setHits] = useState<TrailHit[] | null>(null)
  const [status, setStatus] = useState<Status>({ kind: 'idle' })
  const [saved, setSaved] = useState<Trail[]>([])
  const ctrl = useRef<AbortController | null>(null)

  useEffect(() => {
    void db.trails.toArray().then(setSaved)
    return () => ctrl.current?.abort()
  }, [])

  const run = async (label: string, fn: (signal: AbortSignal) => Promise<TrailHit[]>) => {
    ctrl.current?.abort()
    ctrl.current = new AbortController()
    setTitle(label)
    setHits(null)
    setStatus({ kind: 'searching' })
    try {
      setHits(await fn(ctrl.current.signal))
      setStatus({ kind: 'idle' })
    } catch (e) {
      if (!ctrl.current.signal.aborted) setStatus({ kind: 'error', message: (e as Error).message })
    }
  }

  const fromCatalog = (c: CatalogTrail) =>
    run(c.name, (signal) => searchTrails({ name: c.nameRegex, ref: c.refRegex }, c.bbox, signal))

  const fromText = async () => {
    if (query.trim().length < 3) return
    const area = await searchArea()
    void run(`Suche «${query.trim()}»`, (signal) => searchTrails(userNameFilter(query), area, signal))
  }

  const open = async (hit: Pick<TrailHit, 'id' | 'name' | 'ref' | 'network'>) => {
    ctrl.current?.abort()
    ctrl.current = new AbortController()
    try {
      const trail = await loadTrail(hit, (step, share) => setStatus({ kind: 'loading', step, share }), ctrl.current.signal)
      navigate(`/?trail=${trail.id}`)
    } catch (e) {
      if (!ctrl.current.signal.aborted) setStatus({ kind: 'error', message: (e as Error).message })
    }
  }

  return (
    <div className="h-full overflow-y-auto px-4 py-6">
      <div className="mx-auto max-w-2xl">
        <h1 className="text-2xl font-bold">Fernwanderwege</h1>
        <p className="mt-1 text-muted">Markierte Wege aus OpenStreetMap laden, in Etappen teilen und Übernachtungen finden.</p>

        <form
          className="mt-4 flex items-center rounded-xl border border-line bg-surface focus-within:border-accent"
          onSubmit={(e) => {
            e.preventDefault()
            void fromText()
          }}
        >
          <SearchIcon className="ml-3 shrink-0 text-muted" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Weg suchen (im Umkreis der Karte)"
            aria-label="Fernweg suchen"
            className="min-h-12 w-full bg-transparent px-3 outline-none focus-visible:outline-none"
          />
          <button type="submit" className="min-h-12 shrink-0 px-4 font-semibold text-accent">
            Suchen
          </button>
        </form>

        {status.kind === 'searching' && <p role="status" className="mt-4 text-muted">Suche in OpenStreetMap …</p>}
        {status.kind === 'loading' && (
          <p role="status" className="mt-4 rounded-xl bg-surface p-3">
            {status.step === 'osm'
              ? 'Weg wird aus OpenStreetMap geladen. Bei langen Wegen kann das eine Minute dauern …'
              : `Höhen werden ergänzt … ${Math.round((status.share ?? 0) * 100)} %`}
          </p>
        )}
        {status.kind === 'error' && (
          <p role="alert" className="mt-4 rounded-xl border border-danger p-3 text-danger">
            {status.message}
          </p>
        )}

        {hits && (
          <section className="mt-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold">{title}</h2>
              <button type="button" onClick={() => setHits(null)} className="min-h-11 px-2 text-muted">
                Schliessen
              </button>
            </div>
            {hits.length === 0 && <p className="mt-2 text-muted">Keine passenden markierten Wege gefunden.</p>}
            <ul className="mt-2 space-y-2">
              {hits.map((h) => (
                <li key={h.id}>
                  <button type="button" onClick={() => void open(h)} disabled={status.kind === 'loading'} className="block w-full rounded-xl border border-line bg-surface p-3 text-left hover:border-accent">
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

        {saved.length > 0 && (
          <section className="mt-6">
            <h2 className="text-lg font-bold">Geladen (offline verfügbar)</h2>
            <ul className="mt-2 space-y-2">
              {saved.map((t) => (
                <li key={t.id}>
                  <button type="button" onClick={() => navigate(`/?trail=${t.id}`)} className="block w-full rounded-xl border border-line bg-surface p-3 text-left hover:border-accent">
                    <span className="block font-semibold">{t.name}</span>
                    <span className="tabular block text-sm text-muted">
                      {formatKm(cumulativeDistances(t.points).at(-1) ?? 0)}
                      {t.gaps > 0 && ` · ${t.gaps} Lücken in den OSM-Daten`}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section className="mt-6">
          <h2 className="text-lg font-bold">Bekannte Fernwege in Europa</h2>
          <ul className="mt-2 grid gap-2 sm:grid-cols-2">
            {CATALOG.map((c) => (
              <li key={c.id}>
                <button type="button" onClick={() => void fromCatalog(c)} className="block h-full w-full rounded-xl border border-line bg-surface p-3 text-left hover:border-accent">
                  <span className="block font-semibold">{c.name}</span>
                  <span className="block text-xs font-semibold uppercase tracking-wide text-accent">{c.region}</span>
                  <span className="mt-1 block text-sm text-muted">{c.description}</span>
                </button>
              </li>
            ))}
          </ul>
        </section>
        <p className="mt-6 text-xs text-muted">Daten: © OpenStreetMap-Mitwirkende, abgefragt über die Overpass API. Höhen: Mapzen Terrain Tiles.</p>
      </div>
    </div>
  )
}
