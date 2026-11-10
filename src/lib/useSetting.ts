import { useCallback, useEffect, useRef, useState } from 'react'
import { getSetting, setSetting } from './db'

/** Persistente Einstellung aus IndexedDB. `loaded` ist false, bis der Wert gelesen ist. */
export function useSetting<T>(key: string, fallback: T) {
  const [value, setValue] = useState<T>(fallback)
  const [loaded, setLoaded] = useState(false)
  const fallbackRef = useRef(fallback)

  useEffect(() => {
    let alive = true
    getSetting(key, fallbackRef.current).then((v) => {
      if (alive) {
        setValue(v)
        setLoaded(true)
      }
    })
    return () => {
      alive = false
    }
  }, [key])

  const update = useCallback(
    (next: T) => {
      setValue(next)
      void setSetting(key, next)
    },
    [key],
  )

  return [value, update, loaded] as const
}
