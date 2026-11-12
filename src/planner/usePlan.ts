import { useCallback, useEffect, useReducer, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { APP_NAME } from '../config'
import { db, getSetting, setSetting } from '../lib/db'
import { downloadFile, slug } from '../lib/download'
import type { RoutePoint } from '../lib/geo'
import { parseGpx, toGpx } from '../lib/gpx'
import { getTour, saveTour } from '../lib/tours'
import { fetchPois, type Poi } from '../trails/pois'
import { initialPlannerState, plannerReducer, type Plan, type PlannerAction } from './plannerState'
import { autoCuts, type StagePlan } from './stages'
import { useRoute } from './useRoute'

const DRAFT_KEY = 'planner.draft'
const DRAFT_DEBOUNCE_MS = 600

interface Draft {
  plan: Plan
  tourId: string | null
  name: string
  stages?: StagePlan | null
  dirty?: boolean
}

/** Etwas wurde geladen bzw. angefordert; die Oberfläche reagiert darauf (Karte einpassen usw.). */
export interface PlanEvent {
  id: number
  type: 'tour' | 'trail' | 'gpx' | 'new'
  points?: RoutePoint[]
}

const trackPlan = (points: RoutePoint[]): Plan => ({
  kind: 'track',
  points,
  ways: [{ from: 0, to: points.length - 1, surface: 'unknown', sac: null }],
})

/** Schlüssel für den POI-Cache: grobe Signatur der Geometrie + Korridor. */
function signature(points: RoutePoint[]) {
  const f = points[0]
  const l = points[points.length - 1]
  const m = points[points.length >> 1]
  return [points.length, f[0], f[1], m[0], m[1], l[0], l[1]].map((n) => n.toFixed(5)).join('|')
}

/**
 * Zustand und Aktionen der Routenplanung: Wegpunkte mit Rückgängig/Wiederholen, Route,
 * Etappen, POIs, Speichern, GPX. Der Entwurf wird laufend (verzögert) in IndexedDB gesichert.
 */
export function usePlan() {
  const [params, setParams] = useSearchParams()
  const [state, dispatch] = useReducer(plannerReducer, initialPlannerState)
  const plan = state.present
  const { route, pending, error: routeError, retry: retryRoute } = useRoute(plan)
  const [tourId, setTourId] = useState<string | null>(null)
  const [name, setNameState] = useState('')
  const [stages, setStagesState] = useState<StagePlan | null>(null)
  const [dirty, setDirty] = useState(false)
  const [ready, setReady] = useState(false)
  const [event, setEvent] = useState<PlanEvent | null>(null)
  const [pois, setPois] = useState<Poi[] | null>(null)
  const [poiLoading, setPoiLoading] = useState<number | null>(null)
  const [poiError, setPoiError] = useState<string | null>(null)
  const [corridor, setCorridor] = useState(1000)
  const poiCtrl = useRef<AbortController | null>(null)
  const eventId = useRef(0)

  const waypoints = plan.kind === 'waypoints' ? plan.waypoints : []
  const hasRoute = !!route && route.points.length > 1
  const emit = useCallback(
    (type: PlanEvent['type'], points?: RoutePoint[]) => setEvent({ id: ++eventId.current, type, points }),
    [],
  )

  // Entwurf wiederherstellen (ausser die Adresse verlangt etwas anderes)
  const initialParams = useRef(params)
  useEffect(() => {
    if (initialParams.current.get('tour') || initialParams.current.get('trail')) {
      setReady(true)
      return
    }
    void getSetting<Draft | null>(DRAFT_KEY, null).then((d) => {
      if (d) {
        dispatch({ type: 'load', plan: d.plan })
        setTourId(d.tourId)
        setNameState(d.name)
        setStagesState(d.stages ?? null)
        setDirty(d.dirty ?? false)
      }
      setReady(true)
    })
  }, [])

  // ?tour=…, ?trail=… oder ?plan=1: auch später, denn die Karte bleibt beim Seitenwechsel geladen
  const tourParam = params.get('tour')
  const trailParam = params.get('trail')
  const planParam = params.get('plan')
  useEffect(() => {
    if (!ready || (!tourParam && !trailParam && !planParam)) return
    let alive = true
    ;(async () => {
      if (tourParam) {
        const t = await getTour(tourParam)
        if (!alive || !t) return
        dispatch({ type: 'load', plan: t.plan })
        setTourId(t.id)
        setNameState(t.name)
        setStagesState(t.stages ?? null)
        setDirty(false)
        emit('tour', t.points)
      } else if (trailParam) {
        const t = await db.trails.get(Number(trailParam))
        if (!alive || !t) return
        dispatch({ type: 'load', plan: trackPlan(t.points) })
        setTourId(null)
        setNameState(t.name)
        setStagesState(null)
        setDirty(false)
        emit('trail', t.points)
      } else {
        emit('new')
      }
    })().finally(() => alive && setParams({}, { replace: true }))
    return () => {
      alive = false
    }
  }, [ready, tourParam, trailParam, planParam])

  // Entwurf verzögert sichern: grosse Routen bei jedem Tastendruck zu schreiben wäre träge
  useEffect(() => {
    if (!ready) return
    const timer = setTimeout(() => void setSetting<Draft>(DRAFT_KEY, { plan, tourId, name, stages, dirty }), DRAFT_DEBOUNCE_MS)
    return () => clearTimeout(timer)
  }, [plan, tourId, name, stages, dirty, ready])

  // Ändert sich die Route, passen Etappen und POIs nicht mehr: neu aufteilen, POIs aus dem Cache.
  const sig = hasRoute && route ? signature(route.points) : null
  const lastSig = useRef<string | null>(null)
  useEffect(() => {
    if (!ready || pending > 0) return
    const prev = lastSig.current
    lastSig.current = sig
    poiCtrl.current?.abort()
    setPoiLoading(null)
    setPoiError(null)
    if (!sig || !route) {
      setPois(null)
      return
    }
    setStagesState((s) =>
      s && ((prev !== null && prev !== sig) || s.cuts.some((c) => c >= route.points.length - 1))
        ? { ...s, cuts: autoCuts(route, s.metric, s.target) }
        : s,
    )
    let alive = true
    void db.pois.get(`${sig}|${corridor}`).then((c) => alive && setPois(c?.pois ?? null))
    return () => {
      alive = false
    }
  }, [sig, corridor, ready, pending])

  /** Planung ändern (setzt «ungespeichert»). */
  const edit = useCallback((action: PlannerAction) => {
    dispatch(action)
    setDirty(true)
  }, [])
  const setName = useCallback((n: string) => {
    setNameState(n)
    setDirty(true)
  }, [])
  const setStages = useCallback((s: StagePlan | null | ((prev: StagePlan | null) => StagePlan | null)) => {
    setStagesState(s)
    setDirty(true)
  }, [])

  const close = useCallback(() => {
    dispatch({ type: 'clear' })
    setTourId(null)
    setNameState('')
    setStagesState(null)
    setDirty(false)
  }, [])

  const save = useCallback(
    async (asName: string) => {
      if (!route) return
      setNameState(asName)
      setTourId(await saveTour(asName, plan, route, tourId ?? undefined, stages))
      setDirty(false)
    },
    [route, plan, tourId, stages],
  )

  const exportGpx = useCallback(() => {
    if (!route) return
    const n = name || 'Tour'
    downloadFile(`${slug(n)}.gpx`, toGpx(n, route.points, waypoints, APP_NAME), 'application/gpx+xml')
  }, [route, name, waypoints])

  /** GPX als feste Route laden; liefert den Namen. */
  const importGpx = useCallback(async (file: File) => {
    const data = parseGpx(await file.text())
    dispatch({ type: 'load', plan: trackPlan(data.points) })
    setTourId(null)
    setNameState(data.name)
    setStagesState(null)
    setDirty(false)
    emit('gpx', data.points)
    return data.name
  }, [emit])

  const loadPois = useCallback(async () => {
    if (!route || !sig) return
    poiCtrl.current?.abort()
    const ctrl = (poiCtrl.current = new AbortController())
    setPoiError(null)
    setPoiLoading(0)
    try {
      const result = await fetchPois(route.points, corridor, ctrl.signal, setPoiLoading)
      await db.pois.put({ key: `${sig}|${corridor}`, pois: result, fetchedAt: Date.now() })
      setPois(result)
    } catch (e) {
      if (!ctrl.signal.aborted) setPoiError((e as Error).message)
    } finally {
      if (!ctrl.signal.aborted) setPoiLoading(null)
    }
  }, [route, sig, corridor])

  return {
    ready,
    event,
    plan,
    waypoints,
    route: hasRoute ? route : null,
    pending,
    routeError,
    retryRoute,
    canUndo: state.past.length > 0,
    canRedo: state.future.length > 0,
    edit,
    name,
    setName,
    tourId,
    dirty,
    stages,
    setStages,
    pois,
    poiLoading,
    poiError,
    corridor,
    setCorridor,
    loadPois,
    close,
    save,
    exportGpx,
    importGpx,
  }
}

export type PlanSession = ReturnType<typeof usePlan>
