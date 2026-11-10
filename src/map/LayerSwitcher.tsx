import { useEscape } from '../lib/useEscape'
import { useState } from 'react'
import { CloseIcon, LayersIcon } from '../components/icons'
import { BASE_MAPS, OVERLAYS, type BaseMapId, type OverlayId } from './layers'

interface Props {
  baseId: BaseMapId
  overlays: Record<OverlayId, boolean>
  onBaseChange: (id: BaseMapId) => void
  onOverlaysChange: (o: Record<OverlayId, boolean>) => void
}

export default function LayerSwitcher({ baseId, overlays, onBaseChange, onOverlaysChange }: Props) {
  const [open, setOpen] = useState(false)
  useEscape(open, () => setOpen(false))

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Kartenebenen"
        className="map-fab absolute right-2.5 top-[212px] z-10"
      >
        <LayersIcon />
      </button>
      {open && (
        <div className="absolute inset-0 z-30 flex items-end bg-black/40 sm:items-start sm:justify-end" onClick={() => setOpen(false)}>
          <section
            role="dialog"
            aria-label="Kartenebenen"
            onClick={(e) => e.stopPropagation()}
            className="w-full rounded-t-2xl border border-text bg-surface p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] sm:m-3 sm:w-80 sm:rounded-2xl"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold">Karte</h2>
              <button type="button" onClick={() => setOpen(false)} aria-label="Schliessen" className="flex size-11 items-center justify-center rounded-full text-muted hover:bg-surface-2">
                <CloseIcon />
              </button>
            </div>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {BASE_MAPS.map((b) => (
                <button
                  key={b.id}
                  type="button"
                  aria-pressed={b.id === baseId}
                  onClick={() => onBaseChange(b.id)}
                  className={`min-h-16 rounded-xl border-2 p-3 text-left ${
                    b.id === baseId ? 'border-accent bg-surface-2' : 'border-line'
                  }`}
                >
                  <span className="block font-semibold">{b.label}</span>
                  <span className="block text-xs text-muted">{b.description}</span>
                </button>
              ))}
            </div>
            <h3 className="mt-4 label text-muted">Ebenen</h3>
            <ul className="mt-1">
              {OVERLAYS.map((o) => (
                <li key={o.id}>
                  <label className="flex min-h-12 cursor-pointer items-center justify-between gap-3">
                    <span>{o.label}</span>
                    <input
                      type="checkbox"
                      checked={overlays[o.id]}
                      onChange={(e) => onOverlaysChange({ ...overlays, [o.id]: e.target.checked })}
                      className="size-6 accent-accent"
                    />
                  </label>
                </li>
              ))}
            </ul>
          </section>
        </div>
      )}
    </>
  )
}
