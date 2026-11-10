import { formatDuration } from '../lib/hikingTime'
import { formatKm, formatM } from '../lib/format'
import type { Route } from '../routing/route'
import { SAC_LABELS, SAC_ORDER, SURFACE_COLORS, SURFACE_LABELS, type SurfaceClass } from '../routing/wayInfo'

export function StatsRow({ route }: { route: Route | null }) {
  const items = [
    { label: 'Distanz', value: route ? formatKm(route.distance) : '–' },
    { label: '↑ Aufstieg', value: route?.hasElevation ? formatM(route.ascent) : '–' },
    { label: '↓ Abstieg', value: route?.hasElevation ? formatM(route.descent) : '–' },
    { label: 'Wanderzeit', value: route ? formatDuration(route.duration, true) : '–' },
  ]
  return (
    <dl className="grid grid-cols-4 gap-1">
      {items.map((i) => (
        <div key={i.label} className="min-w-0">
          <dt className="text-[11px] font-semibold uppercase tracking-wide text-muted">{i.label}</dt>
          <dd className="tabular truncate text-[clamp(0.95rem,4.6vw,1.25rem)] font-bold leading-tight">{i.value}</dd>
        </div>
      ))}
    </dl>
  )
}

/** Wegbeschaffenheit und SAC-Schwierigkeit, soweit OSM-Daten vorhanden sind. */
export function WayDetails({ route }: { route: Route }) {
  const surfaces = (Object.entries(route.surfaces) as [SurfaceClass, number][])
    .filter(([, m]) => m > 0)
    .sort((a, b) => b[1] - a[1])
  const total = route.distance || 1
  const sacEntries = SAC_ORDER.filter((g) => route.sac[g])
  const sacKnown = sacEntries.reduce((s, g) => s + (route.sac[g] ?? 0), 0)

  return (
    <div className="space-y-3">
      <section>
        <h3 className="text-sm font-semibold text-muted">Wegbeschaffenheit</h3>
        <div className="mt-1 flex h-3 overflow-hidden rounded-full" aria-hidden>
          {surfaces.map(([s, m]) => (
            <div key={s} style={{ width: `${(m / total) * 100}%`, background: SURFACE_COLORS[s] }} />
          ))}
        </div>
        <ul className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-sm">
          {surfaces.map(([s, m]) => (
            <li key={s} className="flex items-center gap-2">
              <span className="size-3 shrink-0 rounded-sm" style={{ background: SURFACE_COLORS[s] }} />
              <span className="flex-1 truncate">{SURFACE_LABELS[s]}</span>
              <span className="tabular text-muted">{formatKm(m)}</span>
            </li>
          ))}
        </ul>
      </section>
      <section>
        <h3 className="text-sm font-semibold text-muted">Schwierigkeit (SAC-Skala)</h3>
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
          </>
        ) : (
          <p className="mt-1 text-sm text-muted">Für diese Route sind in OpenStreetMap keine SAC-Angaben erfasst.</p>
        )}
      </section>
    </div>
  )
}
