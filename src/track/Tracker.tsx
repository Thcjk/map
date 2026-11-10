import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import * as maplibregl from 'maplibre-gl'
import type { GeoJSONSource, Map as MlMap } from 'maplibre-gl'
import { RecordIcon } from '../components/icons'
import { buildActivity, saveActivity } from '../lib/activities'
import { formatKm, formatM } from '../lib/format'
import { elevationGainLoss } from '../lib/geo'
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

/** GPS-Aufzeichnung und Navigation auf der geplanten Route. */
export default function Tracker({ route }: { route: Route | null }) {
  const map = useMap()
  const t = useTracker()
  const { rec } = t
  const [intro, setIntro] = useState(false)
  const [finishing, setFinishing] = useState(false)
  const [name, setName] = useState('')
  const [now, setNow] = useState(Date.now())
  const [follow, setFollow] = useState(true)
  const active = rec.status !== 'idle'

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

  const ascent = useMemo(() => elevationGainLoss(rec.points.map((p) => p[2]), 10).ascent, [rec.points])
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
    return (
      <>
        <button type="button" onClick={() => setIntro(true)} aria-label="Tour aufzeichnen" className="map-fab absolute right-2.5 top-[268px] z-10 text-mark">
          <RecordIcon />
        </button>
        {intro && (
          <div className="absolute inset-0 z-30 flex items-end bg-black/40 sm:items-center sm:justify-center" onClick={() => setIntro(false)}>
            <section role="dialog" aria-label="Tour aufzeichnen" onClick={(e) => e.stopPropagation()} className="w-full rounded-t-2xl border border-text bg-surface p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] sm:w-96 sm:rounded-2xl">
              <h2 className="text-lg font-bold">Tour aufzeichnen</h2>
              <p className="mt-2 text-sm">
                {route ? 'Die geplante Route wird mitgeführt: Reststrecke, Rest-Höhenmeter und Warnung beim Abweichen.' : 'Ohne geplante Route wird nur aufgezeichnet.'}
              </p>
              <p className="mt-2 border-l-2 border-mark pl-3 text-sm text-muted">
                Ehrlich gesagt: Eine Web-App kann nur aufzeichnen, solange sie offen und der Bildschirm an ist. Der Bildschirm bleibt
                darum eingeschaltet. Sperrst du das Handy oder wechselst die App, pausiert der Browser das GPS, besonders auf dem
                iPhone. Das kostet Akku; für lange Touren eine Powerbank mitnehmen.
              </p>
              <button type="button" onClick={begin} className="mt-4 min-h-13 w-full rounded-xl bg-accent text-lg font-bold text-bg">
                Aufzeichnung starten
              </button>
            </section>
          </div>
        )}
      </>
    )
  }

  return (
    <section aria-label="Aufzeichnung" className="absolute inset-x-2.5 top-2.5 z-30 max-w-md rounded-xl border border-text bg-surface p-3">
      <div className="flex items-center gap-2">
        <span className={`size-3 rounded-full ${rec.status === 'recording' ? 'animate-pulse bg-mark' : 'bg-muted'}`} aria-hidden />
        <span className="label flex-1">{rec.status === 'recording' ? 'Aufzeichnung läuft' : 'Pausiert'}</span>
        {!follow && (
          <button type="button" onClick={() => setFollow(true)} className="label min-h-9 rounded-lg border border-line px-2">
            Zentrieren
          </button>
        )}
      </div>
      <dl className="mt-2 grid grid-cols-3 gap-2">
        {[
          ['Zeit', formatClock(elapsed)],
          ['Distanz', formatKm(rec.distance)],
          ['↑ Aufstieg', formatM(ascent)],
        ].map(([l, v]) => (
          <div key={l}>
            <dt className="label text-[10px]! text-muted">{l}</dt>
            <dd className="tabular text-xl font-semibold">{v}</dd>
          </div>
        ))}
      </dl>
      {nav && (
        <dl className="mt-2 grid grid-cols-3 gap-2 border-t border-line pt-2">
          {[
            ['Rest', formatKm(nav.remainingDistance)],
            ['Rest ↑', formatM(nav.remainingAscent)],
            ['Rest Zeit', formatDuration(nav.remainingMinutes, true)],
          ].map(([l, v]) => (
            <div key={l}>
              <dt className="label text-[10px]! text-muted">{l}</dt>
              <dd className="tabular text-lg font-semibold">{v}</dd>
            </div>
          ))}
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
          <input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="Name der Tour" aria-label="Name der Tour" className="min-h-12 w-full rounded-xl border border-line bg-bg px-3" />
          <div className="flex gap-2">
            <button type="submit" disabled={rec.points.length < 2} className="min-h-12 flex-1 rounded-xl bg-accent font-bold text-bg disabled:opacity-40">
              Speichern
            </button>
            <button type="button" onClick={() => confirm('Aufzeichnung wirklich verwerfen?') && void finish(false)} className="min-h-12 rounded-xl px-3 text-danger">
              Verwerfen
            </button>
            <button type="button" onClick={() => setFinishing(false)} className="min-h-12 rounded-xl px-3 text-muted">
              Zurück
            </button>
          </div>
        </form>
      ) : (
        <div className="mt-3 flex gap-2">
          {rec.status === 'recording' ? (
            <button type="button" onClick={t.pause} className="min-h-12 flex-1 rounded-xl border border-text font-bold">
              Pause
            </button>
          ) : (
            <button type="button" onClick={t.resume} className="min-h-12 flex-1 rounded-xl bg-accent font-bold text-bg">
              Weiter
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              t.pause()
              setFinishing(true)
            }}
            className="min-h-12 flex-1 rounded-xl border border-text font-bold"
          >
            Beenden
          </button>
        </div>
      )}
    </section>
  )
}
