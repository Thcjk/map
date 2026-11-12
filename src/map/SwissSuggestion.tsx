import { useEffect, useState } from 'react'
import { useSetting } from '../lib/useSetting'
import { useMap } from './MapContext'
import { isInSwitzerland } from './switzerland'

/** Schlägt die swisstopo-Wanderkarte vor, sobald die Kartenmitte in der Schweiz liegt. */
export default function SwissSuggestion({ onAccept }: { onAccept: () => void }) {
  const map = useMap()
  const [dismissed, setDismissed, loaded] = useSetting('map.swissSuggestionDismissed', false)
  const [inSwitzerland, setInSwitzerland] = useState(false)

  useEffect(() => {
    if (!map) return
    const check = () => {
      const c = map.getCenter()
      setInSwitzerland(map.getZoom() >= 8 && isInSwitzerland(c.lng, c.lat))
    }
    check()
    map.on('moveend', check)
    return () => {
      map.off('moveend', check)
    }
  }, [map])

  if (!loaded || dismissed || !inSwitzerland) return null

  return (
    <div role="status" className="panel absolute left-2.5 right-16 top-[96px] z-20 flex items-center gap-2 p-2.5 sm:right-auto sm:w-[400px]">
      <p className="flex-1 text-sm">In der Schweiz zeigt die swisstopo-Wanderkarte mehr Details.</p>
      <button type="button" onClick={onAccept} className="btn btn-sm btn-primary">
        Wechseln
      </button>
      <button type="button" onClick={() => setDismissed(true)} className="btn btn-sm btn-bare" aria-label="Hinweis schliessen">
        Nein
      </button>
    </div>
  )
}
