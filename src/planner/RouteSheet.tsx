import { useState } from 'react'
import { CloseIcon, MoreIcon, PenIcon, PlayIcon } from '../components/icons'
import Sheet from '../components/Sheet'
import OfflinePanel from '../offline/OfflinePanel'
import type { Route } from '../routing/route'
import type { Poi, PoiCategory } from '../trails/pois'
import ElevationProfile from './ElevationProfile'
import PoiPanel from './PoiPanel'
import { ElevationRange, StatsNotes, StatsRow, WayDetails } from './RouteStats'
import StagesPanel from './StagesPanel'
import type { PlanSession } from './usePlan'

export type RouteTab = 'overview' | 'stages' | 'pois' | 'offline'

const TABS: [RouteTab, string][] = [
  ['overview', 'Profil'],
  ['stages', 'Etappen'],
  ['pois', 'Unterwegs'],
  ['offline', 'Offline'],
]

interface Props {
  session: PlanSession
  route: Route
  open: boolean
  onOpenChange: (open: boolean) => void
  tab: RouteTab
  onTab: (tab: RouteTab) => void
  highlightIndex: number | null
  onHighlight: (index: number | null) => void
  poiFilter: Set<PoiCategory>
  onPoiFilter: (f: Set<PoiCategory>) => void
  onStart: () => void
  onSave: () => void
  onEdit: () => void
  onMenu: () => void
  onClose: () => void
  onFocusRange: (from: number, to: number) => void
  onFocusPoi: (p: Poi) => void
}

/** Fertige Route: Kennzahlen und Hauptaktionen immer sichtbar, Details zum Aufziehen. */
export default function RouteSheet(p: Props) {
  const s = p.session
  // Inhalte erst rendern, wenn das Panel einmal geöffnet wurde (spart Arbeit bei langen Routen)
  const [everOpen, setEverOpen] = useState(p.open)
  if (p.open && !everOpen) setEverOpen(true)

  const header = (
    <>
      <div className="flex items-center gap-2">
        <h2 className="min-w-0 flex-1 truncate text-lg font-bold">{s.name || 'Neue Route'}</h2>
        {s.dirty && <span className="label shrink-0 text-[10px]! text-mark">ungespeichert</span>}
        <button type="button" onClick={p.onClose} aria-label="Route schliessen" className="-m-1 flex size-11 shrink-0 items-center justify-center text-muted">
          <CloseIcon />
        </button>
      </div>
      <StatsRow route={p.route} />
      {s.pending > 0 && (
        <p className="label mt-1 text-muted" role="status">
          Route wird berechnet …
        </p>
      )}
      <div className="mt-3 flex gap-2">
        <button type="button" onClick={p.onStart} className="btn btn-primary min-w-0 flex-1 px-2!">
          <PlayIcon width={16} height={16} /> Starten
        </button>
        <button type="button" onClick={p.onSave} disabled={s.pending > 0} className="btn min-w-0 flex-1 px-2!">
          {s.tourId && !s.dirty ? 'Gespeichert' : 'Speichern'}
        </button>
        {s.plan.kind === 'waypoints' && (
          <button type="button" onClick={p.onEdit} aria-label="Route bearbeiten" className="btn btn-icon">
            <PenIcon />
          </button>
        )}
        <button type="button" onClick={p.onMenu} aria-label="Weitere Aktionen" className="btn btn-icon">
          <MoreIcon />
        </button>
      </div>
    </>
  )

  return (
    <Sheet label="Route" header={header} open={p.open} onOpenChange={p.onOpenChange}>
      <div role="tablist" aria-label="Ansicht" className="segmented mb-3">
        {TABS.map(([id, label]) => (
          <button key={id} type="button" role="tab" aria-selected={p.tab === id} onClick={() => p.onTab(id)}>
            {label}
          </button>
        ))}
      </div>
      {everOpen && p.tab === 'overview' && (
        <div className="space-y-4">
          {p.route.hasElevation ? (
            <ElevationProfile route={p.route} highlightIndex={p.highlightIndex} onHighlight={p.onHighlight} />
          ) : (
            <p className="text-sm text-muted">Für diese Route fehlen Höhendaten.</p>
          )}
          <ElevationRange route={p.route} />
          <StatsNotes route={p.route} />
          <WayDetails route={p.route} />
        </div>
      )}
      {everOpen && p.tab === 'stages' && (
        <StagesPanel route={p.route} plan={s.stages} pois={s.pois} onChange={s.setStages} onFocusStage={p.onFocusRange} />
      )}
      {everOpen && p.tab === 'pois' && (
        <PoiPanel
          pois={s.pois}
          loading={s.poiLoading}
          error={s.poiError}
          corridor={s.corridor}
          filter={p.poiFilter}
          onCorridor={s.setCorridor}
          onFilter={p.onPoiFilter}
          onLoad={() => void s.loadPois()}
          onFocus={p.onFocusPoi}
        />
      )}
      {everOpen && p.tab === 'offline' && <OfflinePanel route={p.route} name={s.name} />}
    </Sheet>
  )
}
