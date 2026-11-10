import { useEffect } from 'react'
import type { Map as MlMap } from 'maplibre-gl'

/**
 * true, sobald der Stil geparst ist und Ebenen hinzugefügt werden dürfen.
 * `map.isStyleLoaded()` reicht nicht: Es bleibt false, solange noch Tiles laden.
 */
export function styleReady(map: MlMap): boolean {
  return (map as unknown as { style?: { _loaded?: boolean } }).style?._loaded === true
}

/**
 * Legt App-Ebenen an und nach jedem Stilwechsel erneut (setStyle entfernt alle Ebenen).
 * `setup` muss idempotent sein; Ebenen-IDs beginnen mit «app-».
 */
export function useAppLayers(map: MlMap | null, setup: (map: MlMap) => void) {
  useEffect(() => {
    if (!map) return
    const run = () => setup(map)
    if (styleReady(map)) run()
    map.on('style.load', run)
    return () => {
      map.off('style.load', run)
    }
  }, [map, setup])
}
