import { formatKm } from '../lib/format'
import { kindLabel, POI_CATEGORIES, type Poi, type PoiCategory } from '../trails/pois'

export const CORRIDORS = [500, 1000, 2000]

interface Props {
  pois: Poi[] | null
  loading: number | null
  error: string | null
  corridor: number
  filter: Set<PoiCategory>
  onCorridor: (m: number) => void
  onFilter: (f: Set<PoiCategory>) => void
  onLoad: () => void
  onFocus: (p: Poi) => void
}

export default function PoiPanel({ pois, loading, error, corridor, filter, onCorridor, onFilter, onLoad, onFocus }: Props) {
  const visible = pois?.filter((p) => filter.has(p.category)) ?? []
  const count = (c: PoiCategory) => pois?.filter((p) => p.category === c).length ?? 0

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <span className="label text-muted">Korridor</span>
        <div role="radiogroup" aria-label="Korridor" className="segmented flex-1">
          {CORRIDORS.map((m) => (
            <button
              key={m}
              type="button"
              role="radio"
              aria-checked={m === corridor}
              onClick={() => onCorridor(m)}
            >
              {m < 1000 ? `${m} m` : `${m / 1000} km`}
            </button>
          ))}
        </div>
      </div>

      {!pois && loading === null && (
        <button type="button" onClick={onLoad} className="btn btn-primary w-full">
          Hütten, Camping, Wasser, Einkauf laden
        </button>
      )}
      {loading !== null && (
        <p role="status" className="text-sm text-muted">
          POIs werden aus OpenStreetMap geladen … {Math.round(loading * 100)} %
        </p>
      )}
      {error && (
        <p role="alert" className="flex items-center gap-2 text-sm text-danger">
          <span className="flex-1">{error}</span>
          <button type="button" onClick={onLoad} className="btn btn-sm">
            Erneut
          </button>
        </p>
      )}

      {pois && (
        <>
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter">
            {POI_CATEGORIES.map((c) => {
              const on = filter.has(c.id)
              return (
                <button
                  key={c.id}
                  type="button"
                  aria-pressed={on}
                  onClick={() => {
                    const next = new Set(filter)
                    if (on) next.delete(c.id)
                    else next.add(c.id)
                    onFilter(next)
                  }}
                  className={`btn btn-sm normal-case! tracking-normal! ${on ? '' : 'btn-quiet text-muted!'}`}
                >
                  <span className="size-2.5 rounded-full" style={{ background: on ? c.color : 'transparent', border: `2px solid ${c.color}` }} />
                  {c.label} <span className="tabular text-muted">{count(c.id)}</span>
                </button>
              )
            })}
          </div>
          {visible.length === 0 && <p className="text-sm text-muted">Keine Einträge für diese Auswahl.</p>}
          <ul className="divide-y divide-line">
            {visible.slice(0, 300).map((p) => (
              <li key={p.id}>
                <button type="button" onClick={() => onFocus(p)} className="flex min-h-12 w-full items-center gap-3 py-1.5 text-left">
                  <span className="size-3 shrink-0 rounded-full" style={{ background: POI_CATEGORIES.find((c) => c.id === p.category)!.color }} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold">{p.name}</span>
                    <span className="block text-xs text-muted">{kindLabel(p.kind)}</span>
                  </span>
                  <span className="tabular text-right text-xs">
                    <span className="block font-semibold">km {formatKm(p.along).replace(' km', '')}</span>
                    <span className="block text-muted">{Math.round(p.offRoute)} m abseits</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
          {visible.length > 300 && <p className="text-xs text-muted">Die ersten 300 von {visible.length} werden gezeigt.</p>}
          <p className="text-xs text-muted">Daten: © OpenStreetMap-Mitwirkende (Overpass API). Angaben ohne Gewähr, Öffnungszeiten vor Ort prüfen.</p>
        </>
      )}
    </div>
  )
}
