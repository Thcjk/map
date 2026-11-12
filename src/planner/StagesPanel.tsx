import { indexAtDistance } from '../lib/geo'
import { formatHm, formatKm } from '../lib/format'
import { formatDuration } from '../lib/hikingTime'
import type { Route } from '../routing/route'
import { kindLabel, POI_CATEGORIES, type Poi } from '../trails/pois'
import {
  autoCuts,
  METRIC_LABELS,
  moveCut,
  sleepSuggestions,
  snapCutsToSleep,
  stagesOf,
  type StageMetric,
  type StagePlan,
} from './stages'

interface Props {
  route: Route
  plan: StagePlan | null
  pois: Poi[] | null
  onChange: (plan: StagePlan | null) => void
  onFocusStage: (from: number, to: number) => void
}

const color = (c: Poi['category']) => POI_CATEGORIES.find((x) => x.id === c)!.color

export default function StagesPanel({ route, plan, pois, onChange, onFocusStage }: Props) {
  const metric = plan?.metric ?? 'distance'
  const cfg = METRIC_LABELS[metric]
  const target = plan?.target ?? cfg.default
  const stages = plan ? stagesOf(route, plan.cuts) : null
  const noElevation = !route.hasElevation && metric !== 'distance'

  const apply = (m: StageMetric, t: number) => onChange({ metric: m, target: t, cuts: autoCuts(route, m, t) })

  const shift = (i: number, meters: number) => {
    if (!plan) return
    const idx = indexAtDistance(route.cum, route.cum[plan.cuts[i]] + meters)
    onChange({ ...plan, cuts: moveCut(plan.cuts, i, idx, route.points.length) })
  }

  return (
    <div className="space-y-3">
      <div role="radiogroup" aria-label="Aufteilen nach" className="segmented">
        {(Object.keys(METRIC_LABELS) as StageMetric[]).map((m) => (
          <button
            key={m}
            type="button"
            role="radio"
            aria-checked={m === metric}
            onClick={() => apply(m, METRIC_LABELS[m].default)}
          >
            {METRIC_LABELS[m].label}
          </button>
        ))}
      </div>
      <label className="block">
        <span className="flex justify-between text-sm">
          <span className="text-muted">Pro Tag höchstens</span>
          <span className="tabular font-bold">
            {target} {cfg.unit}
          </span>
        </span>
        <input
          type="range"
          min={cfg.min}
          max={cfg.max}
          step={cfg.step}
          value={target}
          onChange={(e) => apply(metric, Number(e.target.value))}
          className="mt-1 h-8 w-full accent-accent"
        />
      </label>
      {noElevation && <p className="text-sm text-danger">Für diese Route fehlen Höhendaten; Aufteilung nach Distanz empfohlen.</p>}

      {!plan && (
        <button type="button" onClick={() => apply(metric, target)} className="btn btn-primary w-full">
          In Etappen aufteilen
        </button>
      )}

      {plan && stages && (
        <>
          <div className="flex gap-2">
            <p className="flex-1 self-center whitespace-nowrap font-semibold">{stages.length} Etappen</p>
            {pois && plan.cuts.length > 0 && (
              <button
                type="button"
                onClick={() => onChange({ ...plan, cuts: snapCutsToSleep(route, plan.cuts, pois) })}
                className="btn btn-sm btn-quiet"
              >
                An Übernachtung
              </button>
            )}
            <button type="button" onClick={() => onChange(null)} className="btn btn-sm btn-bare">
              Aufheben
            </button>
          </div>
          {!pois && <p className="text-sm text-muted">Tipp: Unter «Unterwegs» POIs laden, dann gibt es Übernachtungsvorschläge pro Etappe.</p>}
          <ol className="space-y-2">
            {stages.map((s) => {
              const last = s.index === stages.length - 1
              const sleep = pois && !last ? sleepSuggestions(pois, route.cum[s.to]).slice(0, 3) : []
              return (
                <li key={s.index} className="card p-3">
                  <button type="button" onClick={() => onFocusStage(s.from, s.to)} className="block w-full text-left">
                    <span className="flex items-baseline justify-between">
                      <span className="font-bold">Tag {s.index + 1}</span>
                      <span className="tabular text-xs text-muted">
                        km {formatKm(s.startKm).replace(' km', '')}–{formatKm(route.cum[s.to])}
                      </span>
                    </span>
                    <span className="tabular mt-1 grid grid-cols-4 gap-1 text-sm font-semibold">
                      <span>{formatKm(s.distance)}</span>
                      <span>↑ {route.hasElevation ? formatHm(s.ascent) : '–'}</span>
                      <span>↓ {route.hasElevation ? formatHm(s.descent) : '–'}</span>
                      <span>{formatDuration(s.minutes, true)}</span>
                    </span>
                  </button>
                  {!last && (
                    <div className="mt-2 flex items-center gap-2 text-sm">
                      <span className="flex-1 text-muted">Etappenende</span>
                      <button type="button" aria-label={`Ende Tag ${s.index + 1} einen Kilometer zurück`} onClick={() => shift(s.index, -1000)} className="btn btn-sm btn-quiet">
                        −1 km
                      </button>
                      <button type="button" aria-label={`Ende Tag ${s.index + 1} einen Kilometer weiter`} onClick={() => shift(s.index, 1000)} className="btn btn-sm btn-quiet">
                        +1 km
                      </button>
                    </div>
                  )}
                  {sleep.length > 0 && (
                    <ul className="mt-2 space-y-1 border-t border-line pt-2 text-sm">
                      {sleep.map((p) => (
                        <li key={p.id} className="flex items-center gap-2">
                          <span className="size-2.5 shrink-0 rounded-full" style={{ background: color(p.category) }} />
                          <span className="flex-1 truncate">
                            {p.name} <span className="text-muted">· {kindLabel(p.kind)}</span>
                          </span>
                          <span className="tabular text-xs text-muted">
                            {p.along >= route.cum[s.to] ? '+' : '−'}
                            {formatKm(Math.abs(p.along - route.cum[s.to]))}, {Math.round(p.offRoute)} m abseits
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                  {pois && !last && sleep.length === 0 && (
                    <p className="mt-2 border-t border-line pt-2 text-sm text-muted">Keine Übernachtung in OSM innerhalb ±3 km erfasst.</p>
                  )}
                </li>
              )
            })}
          </ol>
          <p className="text-xs text-muted">Etappenenden lassen sich auch auf der Karte verschieben.</p>
        </>
      )}
    </div>
  )
}
