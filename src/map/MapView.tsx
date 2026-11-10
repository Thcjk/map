import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import * as maplibregl from 'maplibre-gl'
import type { Map as MlMap } from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?url'
import { useSetting } from '../lib/useSetting'
import { registerOfflineProtocol } from '../offline/store'
import { MapContext } from './MapContext'
import { BASE_MAPS, syncLayers, type BaseMap, type BaseMapId, type OverlayId } from './layers'
import { provideStyleImages } from './topoStyle'
import LayerSwitcher from './LayerSwitcher'
import SwissSuggestion from './SwissSuggestion'
import CoordinateReadout from './CoordinateReadout'
import { styleReady } from './useAppLayers'

// Im Bundle findet MapLibre seinen Worker nicht selbst; Vite liefert die URL.
maplibregl.setWorkerUrl(workerUrl)
registerOfflineProtocol()

interface View {
  center: [number, number]
  zoom: number
}

const DEFAULT_VIEW: View = { center: [8.2, 46.8], zoom: 7 }
const DEFAULT_OVERLAYS: Record<OverlayId, boolean> = { trails: false, hillshade: true, contours: true }

export default function MapView({ children }: { children?: ReactNode }) {
  const container = useRef<HTMLDivElement>(null)
  const [map, setMap] = useState<MlMap | null>(null)
  const currentStyle = useRef<BaseMap['style'] | null>(null)
  const [styleError, setStyleError] = useState(false)
  const [view, setView, viewLoaded] = useSetting<View>('map.view', DEFAULT_VIEW)
  const [baseId, setBaseId, baseLoaded] = useSetting<BaseMapId>('map.base', 'openfreemap')
  const [storedOverlays, setOverlays, overlaysLoaded] = useSetting('map.overlays', DEFAULT_OVERLAYS)
  // ältere gespeicherte Einstellungen kennen neue Ebenen noch nicht
  const overlays = useMemo(() => ({ ...DEFAULT_OVERLAYS, ...storedOverlays }), [storedOverlays])
  const ready = viewLoaded && baseLoaded && overlaysLoaded
  const base = BASE_MAPS.find((b) => b.id === baseId) ?? BASE_MAPS[0]

  // Karte einmal erzeugen, sobald die gespeicherten Einstellungen bekannt sind.
  useEffect(() => {
    if (!ready || !container.current) return
    const m = new maplibregl.Map({
      container: container.current,
      style: (currentStyle.current = base.style),
      center: view.center,
      zoom: view.zoom,
      attributionControl: false,
      maxPitch: 60,
    })
    provideStyleImages(m)
    m.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-right')
    m.addControl(new maplibregl.ScaleControl({ unit: 'metric', maxWidth: 120 }), 'bottom-left')
    m.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), 'top-right')
    m.addControl(
      new maplibregl.GeolocateControl({
        positionOptions: { enableHighAccuracy: true },
        trackUserLocation: true,
        showAccuracyCircle: true,
      }),
      'top-right',
    )
    m.on('moveend', () => {
      const c = m.getCenter()
      setView({ center: [c.lng, c.lat], zoom: m.getZoom() })
    })
    m.on('error', (e) => {
      // Fehler einzelner Tiles ignorieren; nur ein nicht ladbarer Stil zählt.
      if (!('sourceId' in e) && !('tile' in e)) setStyleError(true)
      console.warn(e.error)
    })
    m.on('style.load', () => setStyleError(false))
    setMap(m)
    return () => {
      setMap(null)
      m.remove()
    }
    // Nur beim ersten Laden: spätere Änderungen werden unten auf die bestehende Karte angewendet.
  }, [ready])

  // Grundkarte und Overlays synchron halten, auch nach einem Stilwechsel.
  useEffect(() => {
    if (!map) return
    const apply = () => syncLayers(map, base, overlays)
    map.on('style.load', apply)
    if (currentStyle.current !== base.style) {
      currentStyle.current = base.style
      map.setStyle(base.style)
    } else if (styleReady(map)) {
      apply()
    }
    return () => {
      map.off('style.load', apply)
    }
  }, [map, base, overlays])

  return (
    <MapContext.Provider value={map}>
      <div className="absolute inset-0">
        <div ref={container} className="h-full w-full" aria-label="Karte" role="region" />
      </div>
      {styleError && (
        <p role="alert" className="absolute inset-x-4 top-20 z-20 mx-auto max-w-md rounded-xl border border-danger bg-surface p-3 text-sm">
          Die Karte ist gerade nicht erreichbar. Prüfe die Internetverbindung oder wähle eine andere
          Grundkarte.
        </p>
      )}
      {map && (
        <>
          <CoordinateReadout />
          <LayerSwitcher
            baseId={base.id}
            overlays={overlays}
            onBaseChange={setBaseId}
            onOverlaysChange={setOverlays}
          />
          {!base.swiss && <SwissSuggestion onAccept={() => setBaseId('swisstopo-hiking')} />}
          {children}
        </>
      )}
    </MapContext.Provider>
  )
}
