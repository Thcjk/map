import { useCallback, useEffect, useRef, useState } from 'react'
import * as maplibregl from 'maplibre-gl'
import Dialog from '../components/Dialog'
import { useShell } from '../components/ShellContext'
import { bbox, distance, type LngLat, type RoutePoint } from '../lib/geo'
import type { Place } from '../lib/photon'
import Highlights from '../map/Highlights'
import { useMap } from '../map/MapContext'
import SearchBox from '../map/SearchBox'
import Tracker from '../track/Tracker'
import { POI_CATEGORIES, type PoiCategory } from '../trails/pois'
import ExtrasLayer from './ExtrasLayer'
import { PlanningBar, PointCard, StartActions, type PickedPoint } from './PlanPanels'
import RouteLayer from './RouteLayer'
import RouteSheet, { type RouteTab } from './RouteSheet'
import { moveCut } from './stages'
import { usePlan } from './usePlan'

type DialogKind = 'save' | 'menu' | null

/** Standort einmalig bestimmen. */
function currentPosition(): Promise<LngLat> {
  return new Promise((resolve, reject) => {
    if (!('geolocation' in navigator)) return reject(new Error('Dieser Browser kann den Standort nicht bestimmen.'))
    navigator.geolocation.getCurrentPosition(
      (p) => resolve([p.coords.longitude, p.coords.latitude]),
      (e) => reject(new Error(e.code === e.PERMISSION_DENIED ? 'Standort nicht erlaubt. Bitte im Browser für diese Seite freigeben.' : 'Standort gerade nicht verfügbar.')),
      { enableHighAccuracy: true, timeout: 15_000, maximumAge: 30_000 },
    )
  })
}

/**
 * Bedienung der Kartenseite. Vier Zustände, jeweils mit einer Fläche am unteren Rand:
 * frei (Route planen / Aufzeichnen), Planen (Punkte tippen), Route (Kennzahlen, Starten,
 * Speichern, Details) und Aufzeichnen.
 */
export default function Planner() {
  const map = useMap()
  const { onMap, setFocus } = useShell()
  const s = usePlan()
  const [editing, setEditing] = useState(false)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [tab, setTab] = useState<RouteTab>('overview')
  const [profileIndex, setProfileIndex] = useState<number | null>(null)
  const [selected, setSelected] = useState<number | null>(null)
  const [point, setPoint] = useState<PickedPoint | null>(null)
  const [dialog, setDialog] = useState<DialogKind>(null)
  const [saveName, setSaveName] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [recording, setRecording] = useState(false)
  const [startRequest, setStartRequest] = useState(0)
  const [noteAt, setNoteAt] = useState<LngLat | null>(null)
  const [poiFilter, setPoiFilter] = useState<Set<PoiCategory>>(() => new Set(POI_CATEGORIES.map((c) => c.id)))
  const fileInput = useRef<HTMLInputElement>(null)
  const { route, waypoints, edit } = s

  useEffect(() => setFocus(editing || recording), [editing, recording, setFocus])
  useEffect(() => setProfileIndex(null), [route])
  useEffect(() => {
    if (selected !== null && selected >= waypoints.length) setSelected(null)
  }, [selected, waypoints.length])

  const flash = useCallback((m: string) => {
    setMessage(m)
    setTimeout(() => setMessage(null), 4500)
  }, [])

  const fitTo = useCallback(
    (points: (LngLat | RoutePoint)[]) => {
      if (!map || points.length < 2) return
      // zusätzlich zum Kartenrand (siehe oben): Platz für Suche und Bedienelemente
      map.fitBounds(bbox(points), { padding: { top: 90, bottom: 40, left: 40, right: 70 }, maxZoom: 15 })
    },
    [map],
  )

  const mode = recording ? 'recording' : editing ? 'planning' : route ? 'route' : 'idle'

  // Die Flächen am Rand verdecken einen Teil der Karte: Kartenmitte in den sichtbaren Teil rücken.
  useEffect(() => {
    if (!map) return
    const wide = matchMedia('(min-width: 640px)').matches
    const covered = mode === 'idle' ? 0 : wide ? 410 : mode === 'recording' ? 290 : mode === 'planning' ? 220 : 190
    map.easeTo({ padding: { top: 0, right: 0, bottom: wide ? 0 : covered, left: wide ? covered : 0 }, duration: 250 })
  }, [map, mode])

  // Geladene Tour, Fernweg, GPX oder «neu planen»
  const handled = useRef(0)
  useEffect(() => {
    const e = s.event
    if (!e || e.id === handled.current) return
    handled.current = e.id
    setPoint(null)
    setSelected(null)
    if (e.type === 'new') {
      setEditing(true)
      return
    }
    setEditing(false)
    setTab(e.type === 'trail' ? 'stages' : 'overview')
    setSheetOpen(false)
    if (e.points) fitTo(e.points)
  }, [s.event, fitTo])

  // Tastenkürzel am Desktop
  useEffect(() => {
    if (!onMap || !editing) return
    const onKey = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey) || (e.target as HTMLElement).tagName === 'INPUT') return
      if (e.key === 'z' && !e.shiftKey) edit({ type: 'undo' })
      else if (e.key === 'y' || (e.key === 'z' && e.shiftKey)) edit({ type: 'redo' })
      else return
      e.preventDefault()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onMap, editing, edit])

  // Nadel für den gewählten Punkt
  useEffect(() => {
    if (!map || !point) return
    const el = document.createElement('div')
    el.className = 'pin-marker'
    const marker = new maplibregl.Marker({ element: el }).setLngLat([point.lng, point.lat]).addTo(map)
    return () => {
      marker.remove()
    }
  }, [map, point])

  const startPlanning = () => {
    setPoint(null)
    setEditing(true)
  }

  const discardIfAllowed = (question: string) => !s.dirty || confirm(question)

  const closeRoute = () => {
    if (!discardIfAllowed('Die Route hat ungespeicherte Änderungen. Trotzdem schliessen?')) return
    s.close()
    setEditing(false)
    setSheetOpen(false)
    setSelected(null)
  }

  const finishPlanning = () => {
    setEditing(false)
    setSelected(null)
    setPoint(null)
    // Ein einzelner Punkt ist noch keine Route: zurück zum Ausgangszustand.
    if (!route) s.close()
    else fitTo(route.points)
  }

  const cancelPlanning = () => {
    if (waypoints.length > 0 && !confirm('Planung verwerfen?')) return
    s.close()
    setEditing(false)
    setSelected(null)
    setPoint(null)
  }

  const startAtLocation = async (then?: LngLat) => {
    try {
      const me = await currentPosition()
      edit({ type: 'add', at: me })
      if (then) edit({ type: 'add', at: then })
      else map?.flyTo({ center: me, zoom: Math.max(map.getZoom(), 13) })
      setPoint(null)
      setEditing(true)
    } catch (e) {
      flash((e as Error).message)
    }
  }

  const onPick = (place: Place) => {
    // Bei einer fertigen Route bewegt die Suche nur die Karte.
    if (route && !editing) return
    setPoint({ lng: place.lng, lat: place.lat, name: place.name, detail: place.detail })
  }

  const openSave = () => {
    setSaveName(s.name)
    setDialog('save')
  }

  const importFile = async (file: File) => {
    try {
      flash(`«${await s.importGpx(file)}» importiert.`)
    } catch (e) {
      flash((e as Error).message)
    }
  }

  const isLoop = waypoints.length > 2 && distance(waypoints[0], waypoints[waypoints.length - 1]) < 30
  const menuItem = (label: string, action: () => void, danger = false) => (
    <li key={label}>
      <button
        type="button"
        onClick={() => {
          setDialog(null)
          action()
        }}
        className={`flex min-h-13 w-full items-center text-left ${danger ? 'text-danger' : ''}`}
      >
        {label}
      </button>
    </li>
  )

  return (
    <>
      <RouteLayer
        route={route}
        waypoints={waypoints}
        editable={editing && !recording}
        highlightIndex={profileIndex}
        selected={selected}
        onAdd={(at) => edit({ type: 'add', at })}
        onInsert={(index, at) => edit({ type: 'insert', index, at })}
        onMove={(index, to) => edit({ type: 'move', index, to })}
        onSelect={setSelected}
        onTap={(at) => mode === 'idle' && setPoint({ lng: at[0], lat: at[1] })}
      />
      <ExtrasLayer
        route={route}
        cuts={s.stages?.cuts ?? []}
        onMoveCut={(i, index) => route && s.setStages((st) => (st ? { ...st, cuts: moveCut(st.cuts, i, index, route.points.length) } : st))}
        pois={s.pois}
        filter={poiFilter}
      />
      <Tracker route={route} startRequest={startRequest} onActiveChange={setRecording} onNote={setNoteAt} />
      <Highlights request={noteAt} onDone={() => setNoteAt(null)} />
      <input
        ref={fileInput}
        type="file"
        accept=".gpx,application/gpx+xml"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (f) void importFile(f)
          e.target.value = ''
        }}
      />

      {mode !== 'recording' && <SearchBox onPick={onPick} />}

      {message && (
        <p role="status" className="absolute inset-x-4 top-[72px] z-30 mx-auto max-w-md border border-text bg-text px-4 py-3 text-center font-semibold text-surface">
          {message}
        </p>
      )}

      {point && mode !== 'recording' && mode !== 'route' ? (
        <PointCard
          point={point}
          planning={mode === 'planning'}
          onClose={() => setPoint(null)}
          onStartHere={() => {
            edit({ type: 'add', at: [point.lng, point.lat] })
            startPlanning()
          }}
          onRouteFromLocation={() => void startAtLocation([point.lng, point.lat])}
          onAddWaypoint={() => {
            edit({ type: 'add', at: [point.lng, point.lat] })
            setPoint(null)
          }}
          onNote={() => {
            setNoteAt([point.lng, point.lat])
            setPoint(null)
          }}
        />
      ) : (
        <>
          {mode === 'idle' && s.ready && <StartActions onPlan={startPlanning} onRecord={() => setStartRequest((n) => n + 1)} />}
          {mode === 'planning' && (
            <PlanningBar
              route={route}
              waypointCount={waypoints.length}
              isTrack={s.plan.kind === 'track'}
              pending={s.pending}
              error={s.routeError}
              onRetry={s.retryRoute}
              canUndo={s.canUndo}
              canRedo={s.canRedo}
              onUndo={() => edit({ type: 'undo' })}
              onRedo={() => edit({ type: 'redo' })}
              onMenu={() => setDialog('menu')}
              onDone={finishPlanning}
              onCancel={cancelPlanning}
              onStartAtLocation={() => void startAtLocation()}
              selected={selected}
              onRemoveSelected={() => {
                if (selected !== null) edit({ type: 'remove', index: selected })
                setSelected(null)
              }}
            />
          )}
        </>
      )}

      {mode === 'route' && route && (
        <RouteSheet
          session={s}
          route={route}
          open={sheetOpen}
          onOpenChange={setSheetOpen}
          tab={tab}
          onTab={setTab}
          highlightIndex={profileIndex}
          onHighlight={setProfileIndex}
          poiFilter={poiFilter}
          onPoiFilter={setPoiFilter}
          onStart={() => setStartRequest((n) => n + 1)}
          onSave={openSave}
          onEdit={() => {
            setSheetOpen(false)
            setEditing(true)
          }}
          onMenu={() => setDialog('menu')}
          onClose={closeRoute}
          onFocusRange={(from, to) => {
            setSheetOpen(false)
            fitTo(route.points.slice(from, to + 1))
          }}
          onFocusPoi={(p) => {
            setSheetOpen(false)
            map?.flyTo({ center: [p.lng, p.lat], zoom: Math.max(map.getZoom(), 14) })
          }}
        />
      )}

      {dialog === 'save' && (
        <Dialog title="Tour speichern" onClose={() => setDialog(null)}>
          <form
            onSubmit={async (e) => {
              e.preventDefault()
              await s.save(saveName)
              setDialog(null)
              flash('Tour gespeichert. Du findest sie unter «Touren».')
            }}
          >
            <input autoFocus value={saveName} onChange={(e) => setSaveName(e.target.value)} placeholder="Name der Tour" aria-label="Name der Tour" className="field" />
            <button type="submit" className="btn btn-primary mt-3 w-full">
              {s.tourId ? 'Änderungen speichern' : 'Speichern'}
            </button>
          </form>
        </Dialog>
      )}

      {dialog === 'menu' && (
        <Dialog title="Weitere Aktionen" onClose={() => setDialog(null)}>
          <ul className="divide-y divide-line">
            {route && menuItem('Richtung umkehren', () => edit({ type: 'reverse' }))}
            {mode === 'planning' && waypoints.length >= 2 && !isLoop && menuItem('Rundtour: zurück zum Start', () => edit({ type: 'add', at: waypoints[0] }))}
            {route && mode === 'route' && menuItem('Als GPX exportieren', s.exportGpx)}
            {menuItem('GPX-Datei als Route laden', () => {
              if (discardIfAllowed('Die aktuelle Route hat ungespeicherte Änderungen. Trotzdem ersetzen?')) fileInput.current?.click()
            })}
            {mode === 'planning' && waypoints.length > 0 && menuItem('Alle Punkte löschen', () => edit({ type: 'clear' }), true)}
            {mode === 'route' && menuItem('Route schliessen', closeRoute, true)}
          </ul>
        </Dialog>
      )}
    </>
  )
}
