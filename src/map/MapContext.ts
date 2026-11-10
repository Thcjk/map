import { createContext, useContext } from 'react'
import type { Map as MlMap } from 'maplibre-gl'

export const MapContext = createContext<MlMap | null>(null)

/** Die MapLibre-Karte, sobald sie geladen ist (sonst null). */
export function useMap(): MlMap | null {
  return useContext(MapContext)
}
