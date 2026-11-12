import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import * as maplibregl from 'maplibre-gl'
import type { GeoJSONSource, Map as MlMap } from 'maplibre-gl'
import Dialog from '../components/Dialog'
import { CameraIcon } from '../components/icons'
import { buildActivity, GPS_ELEVATION_THRESHOLD, saveActivity } from '../lib/activities'
import { formatHm, formatKm, formatM } from '../lib/format'
import { elevationGainLoss, type LngLat } from '../lib/geo'
import { formatDuration } from '../lib/hikingTime'
import { useMap } from '../map/MapContext'
import { useAppLayers } from '../map/useAppLayers'
import type { Route } from '../routing/route'
import { GREEN, PAPER_LIGHT } from '../theme'
import { offRouteAlert, unlockAudio } from './alert'
import { cumulativeAscent, navigate } from './navigation'
import { activeMs, formatClock } from './recorder'
import { useTracker } from './useTracker'

const TRACK = 'app-track'
const REPEAT_ALERT_MS = 60_000
const dateFmt = new Intl.DateTimeFormat('de-CH', { dateStyle: 'medium' })

const GPS_MESSAGES = {
  denied: 'Standort nicht erlaubt. Bitte in den Browser-Einstellungen für diese Seite freigeben.',
  unavailable: 'Kein GPS-Signal. Geh ins Freie und warte einen Moment.',
  unsupported: 'Dieser Browser unterstützt keine Standortbestimmung.',
}

interface Props {
  route: Route | null
  /** Zählt hoch, wenn «Starten» bzw. «Aufzeichnen» getippt wurde. */
  startRequest: number
  onActiveChange: (active: boolean) => void
  /** Foto/Notiz an der aktuellen Position ablegen. */
  onNote: (at: LngLat) => void
}

/** GPS-Aufzeichnung und Navigation auf der geplanten Route. */
export default function Tracker({ route, startRequest, onActiveChange, onNote }: Props) {
  const map = useMap()
  const t = useTracker()
  const { rec } = t
  const [intro, setIntro] = useState(false)
  const [finishing, setFinishing] = useState(false)
  const [name, setName] = useState('')
  const [now, setNow] = useState(Date.now())
  const [follow, setFollow] = useState(true)
  const active = rec.status !== 'idle'

  const lastRequest = useRef(startRequest)
  useEffect(() => {
    if (startRequest !== lastRequest.current) {
      lastRequest.current = startRequest
      setIntro(true)
    }
  }, [startRequest])
  useEffect(() => onActiveChange(active), [active, onActiveChange])

  useEffect(() => {
    if (rec.status !== 'recording') return
    const timer = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [rec.status])

  // Aufgezeichnete Spur auf der Karte
  const latest = useRef(rec)
  latest.current = rec
  const setup = useCallback((m: MlMap) => {
    if (!m.getSource(TRACK))
      m.addSource(TRACK, { type: 'geojson', data: { type: 'LineString', coordinates: latest.current.points.map((p) => [p[0], p[1]]) } })
    if (!m.getLayer(`${TRACK}-casing`))
      m.addLayer({ id: `${TRACK}-casing`, type: 'line', source: TRACK, layout: { 'line-join': 'round', 'line-cap': 'round' }, paint: { 'line-color': PAPER_LIGHT, 'line-width': 7 } })
    if (!m.getLayer(TRACK))
      m.addLayer({ id: TRACK, type: 'line', source: TRACK, layout: { 'line-join': 'round', 'line-cap': 'round' }, paint: { 'line-color': GREEN[5], 'line-width': 3.5 } })
  }, [])
  useAppLayers(map, setup)
  useEffect(() => {
    ;(map?.getSource(TRACK) as GeoJSONSource | undefined)?.setData({
      type: 'LineString',
      coordinates: rec.points.map((p) => [p[0], p[1]]),
    })
  }, [map, rec.points])

  // Eigene Position
  const marker = useRef<maplibregl.Marker | null>(null)
  useEffect(() => {
    if (!map || !t.watching || !rec.last) {
      marker.current?.remove()
      marker.current = null
      return
    }
    if (!marker.current) {
      const el = document.createElement('div')
      el.className = 'position-marker'
      marker.current = new maplibregl.Marker({ element: el }).setLngLat([rec.last.lng, rec.last.lat]).addTo(map)
    } else marker.current.setLngLat([rec.last.lng, rec.last.lat])
    if (follow) map.easeTo({ center: [rec.last.lng, rec.last.lat], duration: 600 })
  }, [map, t.watching, rec.last, follow])
  useEffect(() => {
    if (!map) return
    const stop = () => setFollow(false)
    map.on('dragstart', stop)
    return () => {
      map.off('dragstart', stop)
    }
  }, [map])

  // Navigation auf der geplanten Route
  const ascentCum = useMemo(() => (route ? cumulativeAscent(route) : null), [route])
  const nav = useMemo(
    () => (route && ascentCum && rec.last && active ? navigate(route, ascentCum, [rec.last.lng, rec.last.lat], rec.last.accuracy) : null),
    [route, ascentCum, rec.last, active],
  )
  const lastAlert = useRef(0)
  useEffect(() => {
    if (!nav?.isOff || rec.status !== 'recording') {
      if (!nav?.isOff) lastAlert.current = 0
      return
    }
    if (Date.now() - lastAlert.current > REPEAT_ALERT_MS) {
      lastAlert.current = Date.now()
      offRouteAlert()
    }
  }, [nav, rec.status])

  const ascent = useMemo(() => elevationGainLoss(rec.points.map((p) => p[2]), GPS_ELEVATION_THRESHOLD).ascent, [rec.points])
  const elapsed = activeMs(rec, now)

  const begin = () => {
    unlockAudio()
    setIntro(false)
    setFollow(true)
    t.start()
  }

  const finish = async (save: boolean) => {
    if (save && rec.points.length > 1) {
      await saveActivity(buildActivity(name || `Tour vom ${dateFmt.format(rec.startedAt ?? Date.now())}`, 'recorded', rec.points, rec.times, elapsed))
    }
    t.reset()
    t.setWatching(false)
    setFinishing(false)
    setName('')
  }

  if (!active) {
    if (!intro) return null
    return (
      <Dialog title="Tour aufzeichnen" onClose={() => setIntro(false)}>
        <p className="text-sm">
          {route
            ? 'Die Route wird mitgeführt: Reststrecke, Rest-Höhenmeter und eine Warnung, wenn du vom Weg abkommst.'
            : 'Ohne geplante Route wird nur aufgezeichnet.'}
        </p>
        <p className="mt-3 border-l-2 border-mark pl-3 text-sm text-muted">
          Ehrlich gesagt: Eine Web-App zeichnet nur auf, solange sie offen und der Bildschirm an ist. Der Bildschirm bleibt darum
          eingeschaltet. Sperrst du das Handy oder wechselst die App, pausiert der Browser das GPS, besonders auf dem iPhone. Das
          kostet Akku; für lange Touren eine Powerbank mitnehmen.
        </p>
        <button type="button" onClick={begin} className="btn btn-primary mt-4 min-h-14 w-full text-[13px]">
          Aufzeichnung starten
        </button>
      </Dialog>
    )
  }

  const stat = (label: string, value: string, big = false) => (
    <div key={label} className="min-w-0">
      <dt className="label text-[10px]! text-muted">{label}</dt>
      <dd className={`tabular truncate font-semibold ${big ? 'text-xl' : 'text-base'}`}>{value}</dd>
    </div>
  )

  return (
    <section
      aria-label="Aufzeichnung"
      className="panel absolute inset-x-0 bottom-0 z-30 rounded-b-none border-x-0 border-b-0 p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] sm:inset-x-auto sm:bottom-2.5 sm:left-2.5 sm:w-[400px] sm:rounded-b-[4px] sm:border"
    >
      <div className="flex items-center gap-2">
        <span className={`size-3 rounded-full ${rec.status === 'recording' ? 'animate-pulse bg-mark' : 'bg-muted'}`} aria-hidden />
        <h2 className="label flex-1 text-[12px]! font-semibold!">{rec.status === 'recording' ? 'Aufzeichnung läuft' : 'Pausiert'}</h2>
        {!follow && (
          <button type="button" onClick={() => setFollow(true)} className="btn btn-sm">
            Zentrieren
          </button>
        )}
      </div>
      <dl className="mt-2 grid grid-cols-3 gap-2">
        {stat('Zeit', formatClock(elapsed), true)}
        {stat('Distanz', formatKm(rec.distance), true)}
        {stat('Bergauf', formatHm(ascent), true)}
      </dl>
      {nav && (
        <dl className="mt-2 grid grid-cols-3 gap-2 border-t border-line pt-2">
          {stat('Noch', formatKm(nav.remainingDistance))}
          {stat('Noch bergauf', formatHm(nav.remainingAscent))}
          {stat('Noch Gehzeit', formatDuration(nav.remainingMinutes, true))}
        </dl>
      )}
      {nav?.isOff && (
        <p role="alert" className="mt-2 bg-mark px-3 py-2 font-bold text-surface">
          Abseits der Route: {formatM(nav.offRoute)}
        </p>
      )}
      {t.gpsError && <p role="alert" className="mt-2 text-sm text-danger">{GPS_MESSAGES[t.gpsError]}</p>}
      {!t.gpsError && !rec.last && <p role="status" className="mt-2 text-sm text-muted">Warte auf GPS-Signal …</p>}
      {rec.last && rec.last.accuracy > 35 && <p className="mt-2 text-sm text-muted">GPS ungenau (±{Math.round(rec.last.accuracy)} m), Punkte werden übersprungen.</p>}
      {t.wakeLock !== 'on' && (
        <p className="mt-2 text-sm text-muted">
          {t.wakeLock === 'unsupported' ? 'Dieser Browser kann den Bildschirm nicht wach halten. ' : 'Bildschirm-Wachhalten ist gerade nicht aktiv. '}
          Lass den Bildschirm an, sonst stoppt die Aufzeichnung.
        </p>
      )}
      {rec.gapMs > 0 && <p className="mt-2 text-sm text-muted">Unterbrochen für insgesamt {formatDuration(rec.gapMs / 60000)} (App im Hintergrund oder kein Signal).</p>}

      {finishing ? (
        <form
          className="mt-3 space-y-2"
          onSubmit={(e) => {
            e.preventDefault()
            void finish(true)
          }}
        >
          <input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="Name der Tour" aria-label="Name der Tour" className="field" />
          <div className="flex gap-2">
            <button type="submit" disabled={rec.points.length < 2} className="btn btn-primary flex-1">
              Speichern
            </button>
            <button type="button" onClick={() => confirm('Aufzeichnung wirklich verwerfen?') && void finish(false)} className="btn btn-danger">
              Verwerfen
            </button>
            <button type="button" onClick={() => setFinishing(false)} className="btn btn-bare">
              Zurück
            </button>
          </div>
        </form>
      ) : (
        <div className="mt-3 flex gap-2">
          {rec.status === 'recording' ? (
            <button type="button" onClick={t.pause} className="btn flex-1">
              Pause
            </button>
          ) : (
            <button type="button" onClick={t.resume} className="btn btn-primary flex-1">
              Weiter
            </button>
          )}
          <button
            type="button"
            disabled={!rec.last}
            onClick={() => rec.last && onNote([rec.last.lng, rec.last.lat])}
            aria-label="Foto oder Notiz am Standort"
            className="btn btn-icon"
          >
            <CameraIcon />
          </button>
          <button
            type="button"
            onClick={() => {
              t.pause()
              setFinishing(true)
            }}
            className="btn flex-1"
          >
            Beenden
          </button>
        </div>
      )}
    </section>
  )
}
