import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import * as maplibregl from 'maplibre-gl'
import type { IControl, Map as MlMap } from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?url'
import { getSetting, setSetting } from '../lib/db'
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

const VIEW_KEY = 'map.view'
const DEFAULT_VIEW: View = { center: [8.2, 46.8], zoom: 7 }
const DEFAULT_OVERLAYS: Record<OverlayId, boolean> = { trails: false, hillshade: true, contours: true }
const LAYERS_ICON =
  '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m12 3 9 5-9 5-9-5 9-5Z"/><path d="m3 13 9 5 9-5"/></svg>'

/** Eigener Knopf in der Reihe der Karten-Bedienelemente. */
class ButtonControl implements IControl {
  private el = document.createElement('div')
  constructor(icon: string, label: string, onClick: () => void) {
    this.el.className = 'maplibregl-ctrl maplibregl-ctrl-group'
    const button = document.createElement('button')
    button.type = 'button'
    button.setAttribute('aria-label', label)
    button.title = label
    button.innerHTML = icon
    button.className = 'map-ctrl-button'
    button.addEventListener('click', onClick)
    this.el.append(button)
  }
  onAdd() {
    return this.el
  }
  onRemove() {
    this.el.remove()
  }
}

export default function MapView({ children }: { children?: ReactNode }) {
  const container = useRef<HTMLDivElement>(null)
  const [map, setMap] = useState<MlMap | null>(null)
  const currentStyle = useRef<BaseMap['style'] | null>(null)
  const [styleError, setStyleError] = useState(false)
  const [layersOpen, setLayersOpen] = useState(false)
  const [baseId, setBaseId, baseLoaded] = useSetting<BaseMapId>('map.base', 'openfreemap')
  const [storedOverlays, setOverlays, overlaysLoaded] = useSetting('map.overlays', DEFAULT_OVERLAYS)
  // ältere gespeicherte Einstellungen kennen neue Ebenen noch nicht
  const overlays = useMemo(() => ({ ...DEFAULT_OVERLAYS, ...storedOverlays }), [storedOverlays])
  const ready = baseLoaded && overlaysLoaded
  const base = BASE_MAPS.find((b) => b.id === baseId) ?? BASE_MAPS[0]

  // Karte einmal erzeugen, sobald die gespeicherten Einstellungen bekannt sind.
  useEffect(() => {
    if (!ready || !container.current) return
    let m: MlMap | null = null
    let saveTimer: ReturnType<typeof setTimeout> | undefined
    let cancelled = false
    void getSetting<View>(VIEW_KEY, DEFAULT_VIEW).then((view) => {
      if (cancelled || !container.current) return
      const touch = matchMedia('(pointer: coarse)').matches
      m = new maplibregl.Map({
        container: container.current,
        style: (currentStyle.current = base.style),
        center: view.center,
        zoom: view.zoom,
        attributionControl: false,
        maxPitch: 60,
        // Auf Handys mit sehr dichten Displays reicht doppelte Auflösung; das spart viel Grafikleistung.
        pixelRatio: Math.min(devicePixelRatio, 2),
        fadeDuration: 150,
      })
      const map = m
      provideStyleImages(map)
      const attribution = new maplibregl.AttributionControl({ compact: true })
      map.addControl(attribution, 'bottom-right')
      map.addControl(new maplibregl.ScaleControl({ unit: 'metric', maxWidth: 110 }), 'bottom-left')
      // Zoom-Knöpfe nur mit Maus; auf dem Handy zoomt man mit zwei Fingern.
      map.addControl(new maplibregl.NavigationControl({ showZoom: !touch, visualizePitch: true }), 'top-right')
      map.addControl(
        new maplibregl.GeolocateControl({ positionOptions: { enableHighAccuracy: true }, trackUserLocation: true, showAccuracyCircle: true }),
        'top-right',
      )
      map.addControl(new ButtonControl(LAYERS_ICON, 'Kartenebenen', () => setLayersOpen(true)), 'top-right')
      // Quellenangabe eingeklappt starten (Knopf «i» bleibt sichtbar), sonst verdeckt sie die Bedienung.
      map.once('load', () => container.current?.querySelector('.maplibregl-ctrl-attrib')?.classList.remove('maplibregl-compact-show'))
      // Ansicht merken, ohne die Oberfläche neu zu zeichnen
      map.on('moveend', () => {
        clearTimeout(saveTimer)
        saveTimer = setTimeout(() => {
          const c = map.getCenter()
          void setSetting<View>(VIEW_KEY, { center: [c.lng, c.lat], zoom: map.getZoom() })
        }, 800)
      })
      map.on('error', (e) => {
        // Fehler einzelner Tiles ignorieren; nur ein nicht ladbarer Stil zählt.
        if (!('sourceId' in e) && !('tile' in e)) setStyleError(true)
      })
      map.on('style.load', () => setStyleError(false))
      setMap(map)
    })
    return () => {
      cancelled = true
      clearTimeout(saveTimer)
      setMap(null)
      m?.remove()
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
      {!map && (
        <p role="status" className="label absolute inset-0 flex items-center justify-center text-muted">
          Karte wird geladen …
        </p>
      )}
      {styleError && (
        <p role="alert" className="panel absolute inset-x-4 top-20 z-20 mx-auto max-w-md border-danger p-3 text-sm">
          Die Karte ist gerade nicht erreichbar. Prüfe die Internetverbindung oder wähle eine andere Grundkarte.
        </p>
      )}
      {map && (
        <>
          <CoordinateReadout />
          {layersOpen && (
            <LayerSwitcher baseId={base.id} overlays={overlays} onBaseChange={setBaseId} onOverlaysChange={setOverlays} onClose={() => setLayersOpen(false)} />
          )}
          {!base.swiss && <SwissSuggestion onAccept={() => setBaseId('swisstopo-hiking')} />}
          {children}
        </>
      )}
    </MapContext.Provider>
  )
}
