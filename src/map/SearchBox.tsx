import { useEffect, useId, useState } from 'react'
import { CloseIcon, SearchIcon } from '../components/icons'
import { MIN_QUERY_LENGTH, searchPlaces, type Place } from '../lib/photon'
import { useMap } from './MapContext'

const DEBOUNCE_MS = 350

interface Props {
  /** Gewählter Ort (die Karte fährt selbst dorthin). */
  onPick?: (place: Place) => void
}

export default function SearchBox({ onPick }: Props) {
  const map = useMap()
  const listId = useId()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Place[]>([])
  const [error, setError] = useState<string | null>(null)
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(-1)

  useEffect(() => {
    if (query.trim().length < MIN_QUERY_LENGTH) {
      setResults([])
      setError(null)
      return
    }
    const ctrl = new AbortController()
    const timer = setTimeout(() => {
      const c = map?.getCenter()
      searchPlaces(query, c && { lng: c.lng, lat: c.lat }, ctrl.signal)
        .then((r) => {
          setResults(r)
          setError(null)
          setActive(-1)
        })
        .catch((e: unknown) => {
          if ((e as Error).name !== 'AbortError') setError('Suche zurzeit nicht erreichbar. Bitte später erneut versuchen.')
        })
    }, DEBOUNCE_MS)
    return () => {
      clearTimeout(timer)
      ctrl.abort()
    }
  }, [query, map])

  const select = (p: Place) => {
    setOpen(false)
    setQuery(p.name)
    if (!map) return
    if (p.bbox) map.fitBounds(p.bbox, { padding: 40, maxZoom: 15, duration: 800 })
    else map.flyTo({ center: [p.lng, p.lat], zoom: 14 })
    onPick?.(p)
  }

  const showList = open && (results.length > 0 || error)

  return (
    <div className="absolute left-2.5 right-16 top-2.5 z-20 max-w-md">
      <div className="panel flex items-center focus-within:outline-2 focus-within:outline-mark">
        <SearchIcon className="ml-3 shrink-0 text-muted" />
        <input
          type="search"
          role="combobox"
          aria-expanded={!!showList}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-label="Ort suchen"
          placeholder="Ort, Gipfel, Hütte suchen"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown') setActive((a) => Math.min(a + 1, results.length - 1))
            else if (e.key === 'ArrowUp') setActive((a) => Math.max(a - 1, 0))
            else if (e.key === 'Enter' && results[Math.max(active, 0)]) select(results[Math.max(active, 0)])
            else if (e.key === 'Escape') setOpen(false)
          }}
          className="min-h-12 w-full bg-transparent px-3 text-base outline-none focus-visible:outline-none placeholder:text-muted [&::-webkit-search-cancel-button]:hidden"
        />
        {query && (
          <button type="button" aria-label="Suche leeren" onClick={() => setQuery('')} className="flex size-12 shrink-0 items-center justify-center text-muted">
            <CloseIcon />
          </button>
        )}
      </div>
      {showList && (
        <ul id={listId} role="listbox" className="panel mt-1 overflow-hidden">
          {error && <li className="p-3 text-sm text-danger">{error}</li>}
          {results.map((p, i) => (
            <li key={p.id} role="option" aria-selected={i === active}>
              <button
                type="button"
                onClick={() => select(p)}
                className={`block min-h-12 w-full px-3 py-2 text-left hover:bg-surface-2 ${i === active ? 'bg-surface-2' : ''}`}
              >
                <span className="block font-semibold">{p.name}</span>
                {p.detail && <span className="block text-sm text-muted">{p.detail}</span>}
              </button>
            </li>
          ))}
          <li className="border-t border-line px-3 py-1.5 text-xs text-muted">Suche: Photon · © OpenStreetMap-Mitwirkende</li>
        </ul>
      )}
    </div>
  )
}
