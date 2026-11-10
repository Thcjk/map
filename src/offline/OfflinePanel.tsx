import { useEffect, useMemo, useRef, useState } from 'react'
import type { OfflineRegion } from '../lib/db'
import type { Route } from '../routing/route'
import { deleteRegion, downloadRegion, formatBytes, listRegions, planDownload } from './store'

const CORRIDORS = [1000, 2000, 5000]

/** Karte für den Korridor um die Route herunterladen, Speicher anzeigen, löschen. */
export default function OfflinePanel({ route, name }: { route: Route; name: string }) {
  const [corridor, setCorridor] = useState(2000)
  const [regions, setRegions] = useState<OfflineRegion[]>([])
  const [progress, setProgress] = useState<[number, number] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [usage, setUsage] = useState<{ used: number; quota: number; persisted: boolean } | null>(null)
  const ctrl = useRef<AbortController | null>(null)
  const plan = useMemo(() => planDownload(route.points, corridor), [route, corridor])
  const supported = 'caches' in window

  const refresh = async () => {
    setRegions(await listRegions())
    const est = await navigator.storage?.estimate?.()
    const persisted = (await navigator.storage?.persisted?.()) ?? false
    if (est) setUsage({ used: est.usage ?? 0, quota: est.quota ?? 0, persisted })
  }
  useEffect(() => {
    void refresh()
    return () => ctrl.current?.abort()
  }, [])

  const start = async () => {
    ctrl.current = new AbortController()
    setError(null)
    setProgress([0, plan.omt.length + plan.dem.length])
    try {
      await downloadRegion(name || 'Route', route.points, corridor, ctrl.current.signal, (d, t) => setProgress([d, t]))
    } catch (e) {
      if (!ctrl.current.signal.aborted) setError(navigator.onLine ? (e as Error).message : 'Keine Internetverbindung.')
    }
    setProgress(null)
    await refresh()
  }

  if (!supported) return <p className="text-sm text-muted">Dieser Browser unterstützt keine Offline-Karten.</p>

  return (
    <div className="space-y-3">
      <p className="text-sm">
        Lädt die Topo-Karte mit Relief und Höhenlinien für einen Streifen um die Route. Route, Etappen und geladene POIs sind
        ohnehin offline gespeichert.
      </p>
      <div className="flex items-center gap-2">
        <span className="label text-muted">Streifen</span>
        <div role="radiogroup" aria-label="Breite des Streifens" className="flex flex-1 gap-1 rounded-xl bg-bg p-1">
          {CORRIDORS.map((m) => (
            <button key={m} type="button" role="radio" aria-checked={m === corridor} onClick={() => setCorridor(m)} className={`min-h-10 flex-1 rounded-lg text-sm font-semibold ${m === corridor ? 'bg-accent text-bg' : 'text-muted'}`}>
              ± {m / 1000} km
            </button>
          ))}
        </div>
      </div>
      <p className="tabular text-sm text-muted">
        {plan.omt.length + plan.dem.length} Kacheln, ca. {formatBytes(plan.estimatedBytes)}
      </p>
      {plan.tooLarge && <p className="text-sm text-danger">Zu gross für einen Download. Wähle einen schmaleren Streifen oder lade die Route etappenweise.</p>}

      {progress ? (
        <div>
          <div className="h-3 border border-text" role="progressbar" aria-valuemin={0} aria-valuemax={progress[1]} aria-valuenow={progress[0]}>
            <div className="h-full bg-accent" style={{ width: `${(progress[0] / Math.max(1, progress[1])) * 100}%` }} />
          </div>
          <div className="mt-2 flex items-center justify-between">
            <span className="tabular text-sm">
              {progress[0]} / {progress[1]}
            </span>
            <button type="button" onClick={() => ctrl.current?.abort()} className="min-h-10 rounded-lg border border-line px-3 text-sm">
              Abbrechen
            </button>
          </div>
        </div>
      ) : (
        <button type="button" disabled={plan.tooLarge} onClick={() => void start()} className="min-h-12 w-full rounded-xl bg-accent font-bold text-bg disabled:opacity-40">
          Karte für diese Route herunterladen
        </button>
      )}
      {error && <p role="alert" className="text-sm text-danger">{error}</p>}

      {regions.length > 0 && (
        <section>
          <h3 className="label text-muted">Heruntergeladen</h3>
          <ul className="mt-1 divide-y divide-line">
            {regions.map((r) => (
              <li key={r.id} className="flex items-center gap-2 py-2">
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold">{r.name}</span>
                  <span className="tabular block text-xs text-muted">
                    ± {r.corridor / 1000} km · {r.omt.length + r.dem.length} Kacheln · {formatBytes(r.bytes)}
                    {r.failed > 0 && ` · ${r.failed} fehlen`}
                  </span>
                </span>
                <button
                  type="button"
                  onClick={async () => {
                    await deleteRegion(r.id)
                    await refresh()
                  }}
                  className="min-h-10 rounded-lg px-3 text-sm text-danger"
                >
                  Löschen
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
      {usage && (
        <p className="tabular text-xs text-muted">
          Speicher der App: {formatBytes(usage.used)} von {formatBytes(usage.quota)} belegt.{' '}
          {usage.persisted ? 'Dauerhaft gesichert.' : 'Der Browser darf den Speicher bei Platzmangel leeren; nach dem ersten Download wird dauerhafter Speicher angefragt.'}
        </p>
      )}
      <p className="border-l-2 border-mark pl-3 text-xs text-muted">
        Offline gibt es nur die Topo-Karte. Die swisstopo-Karten und das Wanderwege-Overlay dürfen laut deren
        Nutzungsbedingungen nicht heruntergeladen werden. Für swisstopo-Karten ohne Netz eignet sich die offizielle
        swisstopo-App.
      </p>
    </div>
  )
}
