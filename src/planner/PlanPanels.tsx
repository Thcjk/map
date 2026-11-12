import { CloseIcon, LocateIcon, MoreIcon, RecordIcon, RedoIcon, RouteIcon, UndoIcon } from '../components/icons'
import type { Route } from '../routing/route'
import { StatsRow } from './RouteStats'

/** Ausgangslage ohne Route: zwei klare Einstiege. */
export function StartActions({ onPlan, onRecord }: { onPlan: () => void; onRecord: () => void }) {
  return (
    <div className="absolute inset-x-2.5 bottom-10 z-20 flex gap-2 sm:right-auto sm:w-[400px]">
      <button type="button" onClick={onPlan} className="btn btn-primary min-h-14 flex-1 text-[13px]">
        <RouteIcon /> Route planen
      </button>
      <button type="button" onClick={onRecord} className="btn min-h-14">
        <RecordIcon className="text-mark" /> Aufzeichnen
      </button>
    </div>
  )
}

export interface PickedPoint {
  lng: number
  lat: number
  name?: string
  detail?: string
}

const coords = (p: PickedPoint) => `${Math.abs(p.lat).toFixed(4)}° ${p.lat >= 0 ? 'N' : 'S'}  ${Math.abs(p.lng).toFixed(4)}° ${p.lng >= 0 ? 'E' : 'W'}`

interface PointCardProps {
  point: PickedPoint
  /** Während des Planens: nur «als Wegpunkt hinzufügen». */
  planning: boolean
  onClose: () => void
  onStartHere: () => void
  onRouteFromLocation: () => void
  onAddWaypoint: () => void
  onNote: () => void
}

/** Karte zu einem angetippten Punkt oder Suchtreffer: von hier aus planen oder etwas merken. */
export function PointCard({ point, planning, onClose, onStartHere, onRouteFromLocation, onAddWaypoint, onNote }: PointCardProps) {
  return (
    <section aria-label="Gewählter Punkt" className="panel absolute inset-x-2.5 bottom-10 z-20 p-3 sm:right-auto sm:w-[400px]">
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <h2 className="truncate font-bold">{point.name ?? 'Gewählter Punkt'}</h2>
          {point.detail && <p className="truncate text-sm text-muted">{point.detail}</p>}
          <p className="label mt-0.5 whitespace-pre text-[10px]! text-muted">{coords(point)}</p>
        </div>
        <button type="button" onClick={onClose} aria-label="Schliessen" className="-m-1 flex size-11 shrink-0 items-center justify-center text-muted">
          <CloseIcon />
        </button>
      </div>
      {planning ? (
        <button type="button" onClick={onAddWaypoint} className="btn btn-primary mt-3 w-full">
          Als nächsten Wegpunkt
        </button>
      ) : (
        <>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button type="button" onClick={onStartHere} className="btn btn-primary">
              Hier starten
            </button>
            <button type="button" onClick={onRouteFromLocation} className="btn">
              <LocateIcon width={18} height={18} /> Hierhin
            </button>
          </div>
          <p className="mt-1.5 text-xs text-muted">«Hierhin» plant vom eigenen Standort zu diesem Punkt.</p>
          <button type="button" onClick={onNote} className="btn btn-bare btn-sm mt-1 w-full">
            Notiz oder Foto hier ablegen
          </button>
        </>
      )}
    </section>
  )
}

interface PlanningBarProps {
  route: Route | null
  waypointCount: number
  isTrack: boolean
  pending: number
  error: string | null
  onRetry: () => void
  canUndo: boolean
  canRedo: boolean
  onUndo: () => void
  onRedo: () => void
  onMenu: () => void
  onDone: () => void
  onCancel: () => void
  onStartAtLocation: () => void
  selected: number | null
  onRemoveSelected: () => void
}

/** Leiste während des Planens: Kennzahlen, Rückgängig, Fertig. Jeder Tipp auf die Karte setzt einen Punkt. */
export function PlanningBar(p: PlanningBarProps) {
  const hint =
    p.isTrack
      ? 'Fester Track. Tippe auf die Karte, um stattdessen neu zu planen.'
      : p.waypointCount === 0
        ? 'Tippe auf die Karte, um den Start zu setzen.'
        : p.waypointCount === 1
          ? 'Tippe auf das nächste Ziel. Die Route folgt den Wanderwegen.'
          : 'Weiter tippen verlängert die Route. Punkte ziehen = verschieben, Linie antippen = Zwischenpunkt.'

  return (
    <section aria-label="Routenplanung" className="panel absolute inset-x-0 bottom-0 z-20 rounded-b-none border-x-0 border-b-0 p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] sm:inset-x-auto sm:bottom-2.5 sm:left-2.5 sm:w-[400px] sm:rounded-b-[4px] sm:border">
      <div className="flex items-center gap-2">
        <span className="size-2.5 shrink-0 rounded-full bg-mark" aria-hidden />
        <h2 className="label flex-1 text-[12px]! font-semibold!">Route planen</h2>
        <button type="button" onClick={p.onCancel} aria-label="Planung abbrechen" className="-m-1 flex size-11 items-center justify-center text-muted">
          <CloseIcon />
        </button>
      </div>
      <p className="text-sm text-muted">{hint}</p>

      {p.waypointCount === 0 && !p.isTrack && (
        <button type="button" onClick={p.onStartAtLocation} className="btn btn-sm mt-2">
          <LocateIcon width={18} height={18} /> Bei meinem Standort starten
        </button>
      )}

      {p.route && (
        <div className="mt-2 border-t border-line pt-2">
          <StatsRow route={p.route} />
        </div>
      )}
      {p.pending > 0 && (
        <p className="label mt-2 text-muted" role="status">
          Route wird berechnet …
        </p>
      )}
      {p.error && (
        <p className="mt-2 flex items-center gap-2 text-sm text-danger" role="alert">
          <span className="flex-1">{p.error}</span>
          <button type="button" onClick={p.onRetry} className="btn btn-sm">
            Erneut
          </button>
        </p>
      )}

      {p.selected !== null && (
        <div className="mt-2 flex items-center gap-2 border border-line p-2">
          <span className="flex-1 font-semibold">Wegpunkt {p.selected + 1}</span>
          <button type="button" onClick={p.onRemoveSelected} className="btn btn-sm text-danger">
            Entfernen
          </button>
        </div>
      )}

      <div className="mt-3 flex gap-2">
        <button type="button" className="btn btn-icon" disabled={!p.canUndo} onClick={p.onUndo} aria-label="Rückgängig">
          <UndoIcon />
        </button>
        <button type="button" className="btn btn-icon" disabled={!p.canRedo} onClick={p.onRedo} aria-label="Wiederholen">
          <RedoIcon />
        </button>
        <button type="button" className="btn btn-icon" onClick={p.onMenu} aria-label="Weitere Aktionen">
          <MoreIcon />
        </button>
        <button type="button" className="btn btn-primary flex-1" onClick={p.onDone}>
          Fertig
        </button>
      </div>
    </section>
  )
}
