import { useCallback, useEffect, useReducer, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  ChevronIcon,
  CloseIcon,
  DownloadIcon,
  RedoIcon,
  RouteIcon,
  SaveIcon,
  SwapIcon,
  TrashIcon,
  UndoIcon,
  UploadIcon,
} from '../components/icons'
import { bbox } from '../lib/geo'
import { downloadFile, slug } from '../lib/download'
import { parseGpx, toGpx } from '../lib/gpx'
import { getSetting, setSetting } from '../lib/db'
import { getTour, saveTour } from '../lib/tours'
import { useMap } from '../map/MapContext'
import { APP_NAME } from '../config'
import ElevationProfile from './ElevationProfile'
import RouteLayer from './RouteLayer'
import { StatsRow, WayDetails } from './RouteStats'
import { initialPlannerState, plannerReducer, type Plan } from './plannerState'
import { useRoute } from './useRoute'

const DRAFT_KEY = 'planner.draft'

interface Draft {
  plan: Plan
  tourId: string | null
  name: string
}

export default function Planner() {
  const map = useMap()
  const [params, setParams] = useSearchParams()
  const [state, dispatch] = useReducer(plannerReducer, initialPlannerState)
  const plan = state.present
  const { route, pending, error, retry } = useRoute(plan)
  const [editing, setEditing] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const [highlight, setHighlight] = useState<number | null>(null)
  const [selected, setSelected] = useState<number | null>(null)
  const [tourId, setTourId] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [saveOpen, setSaveOpen] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [draftLoaded, setDraftLoaded] = useState(false)
  const fileInput = useRef<HTMLInputElement>(null)

  const waypoints = plan.kind === 'waypoints' ? plan.waypoints : []
  const hasRoute = !!route && route.points.length > 1

  const fitTo = useCallback(
    (points: [number, number, ...unknown[]][]) => {
      if (map && points.length > 1) {
        const [w, s, e, n] = bbox(points as [number, number][])
        map.fitBounds([w, s, e, n], { padding: { top: 80, bottom: 260, left: 40, right: 70 }, maxZoom: 15 })
      }
    },
    [map],
  )

  // Entwurf wiederherstellen bzw. Tour aus ?tour=… laden
  useEffect(() => {
    const id = params.get('tour')
    let alive = true
    ;(async () => {
      if (id) {
        const t = await getTour(id)
        if (!alive) return
        if (t) {
          dispatch({ type: 'load', plan: t.plan })
          setTourId(t.id)
          setName(t.name)
          fitTo(t.points)
        } else setMessage('Diese Tour gibt es nicht mehr.')
        setParams({}, { replace: true })
      } else {
        const d = await getSetting<Draft | null>(DRAFT_KEY, null)
        if (!alive) return
        if (d) {
          dispatch({ type: 'load', plan: d.plan })
          setTourId(d.tourId)
          setName(d.name)
        }
      }
      setDraftLoaded(true)
    })()
    return () => {
      alive = false
    }
    // nur beim Öffnen der Seite
    // (params wird danach geleert)
  }, [])

  // Entwurf laufend sichern, damit nichts verloren geht
  useEffect(() => {
    if (draftLoaded) void setSetting<Draft>(DRAFT_KEY, { plan, tourId, name })
  }, [plan, tourId, name, draftLoaded])

  // Tastenkürzel am Desktop
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey) || (e.target as HTMLElement).tagName === 'INPUT') return
      if (e.key === 'z' && !e.shiftKey) dispatch({ type: 'undo' })
      else if (e.key === 'y' || (e.key === 'z' && e.shiftKey)) dispatch({ type: 'redo' })
      else return
      e.preventDefault()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  useEffect(() => setHighlight(null), [route])

  const flash = (m: string) => {
    setMessage(m)
    setTimeout(() => setMessage(null), 4000)
  }

  const newPlan = () => {
    dispatch({ type: 'clear' })
    setTourId(null)
    setName('')
    setSelected(null)
  }

  const save = async () => {
    if (!route) return
    const id = await saveTour(name, plan, route, tourId ?? undefined)
    setTourId(id)
    setSaveOpen(false)
    flash('Tour gespeichert.')
  }

  const exportGpx = () => {
    if (!route) return
    const n = name || 'Tour'
    downloadFile(`${slug(n)}.gpx`, toGpx(n, route.points, waypoints, APP_NAME), 'application/gpx+xml')
  }

  const importGpx = async (file: File) => {
    try {
      const data = parseGpx(await file.text())
      dispatch({
        type: 'load',
        plan: {
          kind: 'track',
          points: data.points,
          ways: [{ from: 0, to: data.points.length - 1, surface: 'unknown', sac: null }],
        },
      })
      setTourId(null)
      setName(data.name)
      setEditing(false)
      fitTo(data.points)
      flash(`«${data.name}» importiert.`)
    } catch (e) {
      flash((e as Error).message)
    }
  }

  const toolButton = 'flex min-h-12 min-w-0 flex-1 flex-col items-center justify-center rounded-xl px-0.5 text-[11px] text-muted hover:bg-surface-2 disabled:opacity-35'

  return (
    <>
      <RouteLayer
        route={route}
        waypoints={waypoints}
        editable={editing}
        highlightIndex={highlight}
        selected={selected}
        onAdd={(at) => dispatch({ type: 'add', at })}
        onInsert={(index, at) => dispatch({ type: 'insert', index, at })}
        onMove={(index, to) => dispatch({ type: 'move', index, to })}
        onSelect={setSelected}
      />
      <input
        ref={fileInput}
        type="file"
        accept=".gpx,application/gpx+xml"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (f) void importGpx(f)
          e.target.value = ''
        }}
      />

      {message && (
        <p role="status" className="absolute inset-x-4 top-[72px] z-30 mx-auto max-w-md rounded-xl bg-text px-4 py-3 text-center font-semibold text-bg shadow-xl">
          {message}
        </p>
      )}

      {!editing && !hasRoute ? (
        <div className="absolute bottom-10 left-2.5 z-20 flex gap-2">
          <button type="button" onClick={() => setEditing(true)} className="flex min-h-13 items-center gap-2 rounded-2xl bg-accent px-5 text-lg font-bold text-bg shadow-xl">
            <RouteIcon /> Route planen
          </button>
          <button type="button" onClick={() => fileInput.current?.click()} aria-label="GPX importieren" className="map-fab size-13! shadow-xl">
            <UploadIcon />
          </button>
        </div>
      ) : (
        <section
          aria-label="Routenplanung"
          className="absolute inset-x-0 bottom-0 z-20 max-h-[70%] overflow-y-auto rounded-t-2xl border border-line bg-surface px-3 pt-2 pb-3 shadow-2xl sm:inset-x-auto sm:bottom-2.5 sm:left-2.5 sm:w-[400px] sm:rounded-2xl"
        >
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setExpanded((x) => !x)}
              aria-expanded={expanded}
              aria-label={expanded ? 'Details einklappen' : 'Details anzeigen'}
              className="flex size-11 items-center justify-center rounded-full text-muted hover:bg-surface-2"
            >
              <ChevronIcon className={expanded ? 'rotate-180' : ''} />
            </button>
            <h2 className="flex-1 truncate font-bold">{name || (editing ? 'Neue Route' : 'Route')}</h2>
            <button
              type="button"
              onClick={() => setEditing((x) => !x)}
              aria-pressed={editing}
              className={`min-h-11 rounded-xl px-4 font-semibold ${editing ? 'bg-accent text-bg' : 'border border-line'}`}
            >
              {editing ? 'Fertig' : 'Bearbeiten'}
            </button>
            {!editing && (
              <button type="button" onClick={newPlan} aria-label="Route schliessen" className="flex size-11 items-center justify-center rounded-full text-muted hover:bg-surface-2">
                <CloseIcon />
              </button>
            )}
          </div>

          <div className="mt-1">
            <StatsRow route={hasRoute ? route : null} />
          </div>

          {editing && waypoints.length === 0 && plan.kind === 'waypoints' && (
            <p className="mt-2 text-sm text-muted">Tippe auf die Karte, um den Startpunkt zu setzen.</p>
          )}
          {editing && waypoints.length === 1 && (
            <p className="mt-2 text-sm text-muted">Tippe auf das Ziel. Tippen auf die Linie fügt einen Zwischenpunkt ein, Punkte lassen sich verschieben.</p>
          )}
          {editing && plan.kind === 'track' && (
            <p className="mt-2 text-sm text-muted">Importierter Track. Tippen auf die Karte startet eine neue Planung (Rückgängig stellt ihn wieder her).</p>
          )}
          {pending > 0 && <p className="mt-2 text-sm text-muted" role="status">Route wird berechnet …</p>}
          {error && (
            <p className="mt-2 flex items-center gap-2 text-sm text-danger" role="alert">
              <span className="flex-1">{error}</span>
              <button type="button" onClick={retry} className="min-h-10 rounded-lg border border-danger px-3">
                Erneut
              </button>
            </p>
          )}

          {selected !== null && selected < waypoints.length && editing && (
            <div className="mt-2 flex items-center gap-2 rounded-xl bg-surface-2 p-2">
              <span className="flex-1 font-semibold">Wegpunkt {selected + 1}</span>
              <button
                type="button"
                onClick={() => {
                  dispatch({ type: 'remove', index: selected })
                  setSelected(null)
                }}
                className="min-h-10 rounded-lg bg-danger px-3 font-semibold text-bg"
              >
                Entfernen
              </button>
            </div>
          )}

          <div className="mt-2 flex gap-0.5 border-t border-line pt-2">
            {editing && (
              <>
                <button type="button" className={toolButton} disabled={!state.past.length} onClick={() => dispatch({ type: 'undo' })}>
                  <UndoIcon /> Zurück
                </button>
                <button type="button" className={toolButton} disabled={!state.future.length} onClick={() => dispatch({ type: 'redo' })}>
                  <RedoIcon /> Vor
                </button>
              </>
            )}
            <button type="button" className={toolButton} disabled={!hasRoute} onClick={() => dispatch({ type: 'reverse' })}>
              <SwapIcon /> Umkehren
            </button>
            {editing && (
              <button type="button" className={toolButton} disabled={!hasRoute && !waypoints.length} onClick={newPlan}>
                <TrashIcon /> Löschen
              </button>
            )}
            <button type="button" className={toolButton} disabled={!hasRoute || pending > 0} onClick={() => setSaveOpen(true)}>
              <SaveIcon /> Speichern
            </button>
            <button type="button" className={toolButton} disabled={!hasRoute} onClick={exportGpx}>
              <DownloadIcon /> GPX
            </button>
            <button type="button" className={toolButton} onClick={() => fileInput.current?.click()}>
              <UploadIcon /> Import
            </button>
          </div>

          {saveOpen && (
            <form
              className="mt-2 flex gap-2"
              onSubmit={(e) => {
                e.preventDefault()
                void save()
              }}
            >
              <input
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Name der Tour"
                aria-label="Name der Tour"
                className="min-h-12 flex-1 rounded-xl border border-line bg-bg px-3"
              />
              <button type="submit" className="min-h-12 rounded-xl bg-accent px-4 font-bold text-bg">
                {tourId ? 'Aktualisieren' : 'Speichern'}
              </button>
            </form>
          )}

          {expanded && hasRoute && route && (
            <div className="mt-3 space-y-4">
              {route.hasElevation && (
                <ElevationProfile route={route} highlightIndex={highlight} onHighlight={setHighlight} />
              )}
              <WayDetails route={route} />
            </div>
          )}
        </section>
      )}
    </>
  )
}
