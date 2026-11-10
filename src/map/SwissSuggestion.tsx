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
    <div role="status" className="absolute left-2.5 right-16 top-[112px] z-20 sm:right-auto sm:w-md flex max-w-md items-center gap-3 rounded-2xl border border-text bg-surface p-3">
      <p className="flex-1 text-sm">
        Du bist in der Schweiz. Die swisstopo-Wanderkarte zeigt hier mehr Details.
      </p>
      <button type="button" onClick={onAccept} className="min-h-11 rounded-xl bg-accent px-4 font-semibold text-bg">
        Wechseln
      </button>
      <button type="button" onClick={() => setDismissed(true)} className="min-h-11 rounded-xl px-3 text-muted">
        Nein
      </button>
    </div>
  )
}
