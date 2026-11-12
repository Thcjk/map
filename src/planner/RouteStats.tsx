import { formatDuration } from '../lib/hikingTime'
import { formatHm, formatKm, formatM } from '../lib/format'
import type { Route } from '../routing/route'
import { SAC_LABELS, SAC_ORDER, SURFACE_COLORS, SURFACE_LABELS, type SurfaceClass } from '../routing/wayInfo'

/**
 * Die vier Kennzahlen einer Route. «Bergauf/Bergab» sind Summen in Höhenmetern (Hm),
 * bewusst nicht «m», damit sie niemand mit einer Gipfelhöhe verwechselt.
 */
export function StatsRow({ route }: { route: Route | null }) {
  const items = [
    { label: 'Distanz', value: route ? formatKm(route.distance) : '–' },
    { label: 'Bergauf', value: route?.hasElevation ? formatHm(route.ascent) : '–' },
    { label: 'Bergab', value: route?.hasElevation ? formatHm(route.descent) : '–' },
    { label: 'Gehzeit', value: route ? formatDuration(route.duration, true) : '–' },
  ]
  return (
    <dl className="grid grid-cols-4 gap-1">
      {items.map((i) => (
        <div key={i.label} className="min-w-0">
          <dt className="label text-[10px]! text-muted">{i.label}</dt>
          <dd className="tabular truncate text-[clamp(0.9rem,4.4vw,1.2rem)] font-semibold leading-tight">{i.value}</dd>
        </div>
      ))}
    </dl>
  )
}

/** Tiefster und höchster Punkt mit Grünskala, wie die Höhenlegende eines Kartenblatts. */
export function ElevationRange({ route }: { route: Route }) {
  if (route.minEle === null || route.maxEle === null) return null
  return (
    <section aria-label="Höhenbereich">
      <h3 className="label text-muted">Höhenbereich (m ü. M.)</h3>
      <div className="elevation-scale mt-1.5" aria-hidden />
      <p className="tabular mt-1 flex justify-between gap-2 text-sm">
        <span>tiefster Punkt {formatM(route.minEle)}</span>
        <span>höchster Punkt {formatM(route.maxEle)}</span>
      </p>
    </section>
  )
}

/** Erklärt, was die Zahlen bedeuten und wie genau sie sind. */
export function StatsNotes({ route }: { route: Route }) {
  const days = Math.max(1, Math.round(route.duration / 60 / 7))
  return (
    <ul className="space-y-1 border-l-2 border-line pl-3 text-xs text-muted">
      <li>
        <strong className="font-semibold text-text">Bergauf/Bergab</strong> sind alle Auf- und Abstiege der ganzen Route zusammengezählt
        (Höhenmeter), nicht die Höhe eines Gipfels.
      </li>
      <li>
        <strong className="font-semibold text-text">Gehzeit</strong> ist die reine Gehzeit ohne Pausen (Richtwert: 4 km/h, plus 15 min je
        100 Hm bergauf und je 200 Hm bergab).{route.duration > 9 * 60 && ` Bei rund 7 h pro Tag sind das etwa ${days} Tage.`}
      </li>
      <li>Höhen stammen aus einem Höhenmodell und können um einige Prozent abweichen.</li>
    </ul>
  )
}

/** Wegbeschaffenheit und SAC-Schwierigkeit, soweit OSM-Daten vorhanden sind. */
export function WayDetails({ route }: { route: Route }) {
  const surfaces = (Object.entries(route.surfaces) as [SurfaceClass, number][])
    .filter(([, m]) => m > 0)
    .sort((a, b) => b[1] - a[1])
  const total = route.distance || 1
  const known = surfaces.filter(([s]) => s !== 'unknown')
  const sacEntries = SAC_ORDER.filter((g) => route.sac[g])
  const sacKnown = sacEntries.reduce((s, g) => s + (route.sac[g] ?? 0), 0)

  // Importierte Tracks und OSM-Fernwege tragen keine Wegeigenschaften.
  if (known.length === 0 && !route.sacMax) {
    return <p className="text-sm text-muted">Für diese Route liegen keine Angaben zu Wegbeschaffenheit und Schwierigkeit vor.</p>
  }

  return (
    <div className="space-y-4">
      <section>
        <h3 className="label text-muted">Wegbeschaffenheit</h3>
        <div className="mt-1.5 flex h-2.5 overflow-hidden border border-text" aria-hidden>
          {surfaces.map(([s, m]) => (
            <div key={s} style={{ width: `${(m / total) * 100}%`, background: SURFACE_COLORS[s] }} />
          ))}
        </div>
        <ul className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-sm">
          {surfaces.map(([s, m]) => (
            <li key={s} className="flex items-center gap-2">
              <span className="size-3 shrink-0 border border-text" style={{ background: SURFACE_COLORS[s] }} />
              <span className="flex-1 truncate">{SURFACE_LABELS[s]}</span>
              <span className="tabular text-muted">{formatKm(m)}</span>
            </li>
          ))}
        </ul>
      </section>
      <section>
        <h3 className="label text-muted">Schwierigkeit (SAC-Skala)</h3>
        {route.sacMax ? (
          <>
            <p className="mt-1 font-semibold">Bis {SAC_LABELS[route.sacMax]}</p>
            <ul className="mt-1 text-sm text-muted">
              {sacEntries.map((g) => (
                <li key={g} className="tabular">
                  {g}: {formatKm(route.sac[g]!)}
                </li>
              ))}
              {total - sacKnown > 50 && <li className="tabular">ohne Angabe: {formatKm(total - sacKnown)}</li>}
            </ul>
            <p className="mt-1 text-xs text-muted">Nur so vollständig wie die Einträge in OpenStreetMap. Fehlt eine Angabe, heisst das nicht «leicht».</p>
          </>
        ) : (
          <p className="mt-1 text-sm text-muted">In OpenStreetMap sind für diese Route keine SAC-Angaben erfasst. Das sagt nichts über die Schwierigkeit aus.</p>
        )}
      </section>
    </div>
  )
}
