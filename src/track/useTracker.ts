import { useCallback, useEffect, useReducer, useRef, useState } from 'react'
import { getSetting, setSetting } from '../lib/db'
import { IDLE, recorderReducer, type Recording } from './recorder'

const DRAFT_KEY = 'track.recording'
const SAVE_EVERY_MS = 15_000

export type GpsError = 'denied' | 'unavailable' | 'unsupported' | null

/**
 * GPS-Position beobachten und aufzeichnen. Hält den Bildschirm wach (Screen Wake Lock),
 * sichert die laufende Aufzeichnung regelmässig und stellt sie nach einem Neuladen wieder her.
 */
export function useTracker() {
  const [rec, dispatch] = useReducer(recorderReducer, IDLE)
  const [watching, setWatching] = useState(false)
  const [gpsError, setGpsError] = useState<GpsError>(null)
  const [wakeLock, setWakeLock] = useState<'on' | 'off' | 'unsupported'>('off')
  const latest = useRef(rec)
  latest.current = rec
  const active = rec.status !== 'idle'

  // Unterbrochene Aufzeichnung wiederherstellen (pausiert, damit nichts Falsches gezählt wird)
  useEffect(() => {
    void getSetting<Recording | null>(DRAFT_KEY, null).then((r) => {
      if (r && r.status !== 'idle') {
        const now = Date.now()
        dispatch({
          type: 'restore',
          recording:
            r.status === 'recording'
              ? { ...r, status: 'paused', activeMs: r.activeMs + ((r.times.at(-1) ?? now) - (r.resumedAt ?? now)), resumedAt: null }
              : r,
        })
        setWatching(true)
      }
    })
  }, [])

  // Position beobachten
  useEffect(() => {
    if (!watching) return
    if (!('geolocation' in navigator)) {
      setGpsError('unsupported')
      return
    }
    const id = navigator.geolocation.watchPosition(
      (p) => {
        setGpsError(null)
        dispatch({
          type: 'fix',
          fix: {
            lng: p.coords.longitude,
            lat: p.coords.latitude,
            ele: p.coords.altitude,
            accuracy: p.coords.accuracy,
            time: p.timestamp,
          },
        })
      },
      (e) => setGpsError(e.code === e.PERMISSION_DENIED ? 'denied' : 'unavailable'),
      { enableHighAccuracy: true, maximumAge: 2000, timeout: 30_000 },
    )
    return () => navigator.geolocation.clearWatch(id)
  }, [watching])

  // Bildschirm wach halten, solange aufgezeichnet oder navigiert wird
  useEffect(() => {
    if (!watching) return
    if (!('wakeLock' in navigator)) {
      setWakeLock('unsupported')
      return
    }
    let lock: WakeLockSentinel | null = null
    let cancelled = false
    const request = async () => {
      try {
        lock = await navigator.wakeLock.request('screen')
        if (cancelled) void lock.release()
        else setWakeLock('on')
        lock.addEventListener('release', () => !cancelled && setWakeLock('off'))
      } catch {
        setWakeLock('off')
      }
    }
    // Der Browser gibt die Sperre frei, sobald die App in den Hintergrund geht.
    const onVisible = () => document.visibilityState === 'visible' && void request()
    void request()
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      cancelled = true
      document.removeEventListener('visibilitychange', onVisible)
      void lock?.release()
      setWakeLock('off')
    }
  }, [watching])

  // Laufende Aufzeichnung sichern
  useEffect(() => {
    if (!active) return
    const save = () => void setSetting(DRAFT_KEY, latest.current)
    const timer = setInterval(save, SAVE_EVERY_MS)
    document.addEventListener('visibilitychange', save)
    return () => {
      clearInterval(timer)
      document.removeEventListener('visibilitychange', save)
    }
  }, [active])
  useEffect(() => {
    if (rec.status === 'paused') void setSetting(DRAFT_KEY, rec)
  }, [rec.status])

  const start = useCallback(() => {
    setWatching(true)
    dispatch({ type: 'start', time: Date.now() })
  }, [])
  const pause = useCallback(() => dispatch({ type: 'pause', time: Date.now() }), [])
  const resume = useCallback(() => dispatch({ type: 'resume', time: Date.now() }), [])
  /** Aufzeichnung verwerfen bzw. nach dem Speichern zurücksetzen. */
  const reset = useCallback(() => {
    dispatch({ type: 'reset' })
    void setSetting(DRAFT_KEY, null)
  }, [])

  return { rec, watching, setWatching, gpsError, wakeLock, start, pause, resume, reset }
}
