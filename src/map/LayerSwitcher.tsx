import Dialog from '../components/Dialog'
import { CONTOUR, INK_MUTED, MARK, PAPER_LIGHT, TRAIL } from '../theme'
import { BASE_MAPS, OVERLAYS, type BaseMapId, type OverlayId } from './layers'

interface Props {
  baseId: BaseMapId
  overlays: Record<OverlayId, boolean>
  onBaseChange: (id: BaseMapId) => void
  onOverlaysChange: (o: Record<OverlayId, boolean>) => void
  onClose: () => void
}

export default function LayerSwitcher({ baseId, overlays, onBaseChange, onOverlaysChange, onClose }: Props) {
  return (
    <Dialog title="Karte und Ebenen" onClose={onClose}>
      <div className="grid grid-cols-2 gap-2">
        {BASE_MAPS.map((b) => (
          <button
            key={b.id}
            type="button"
            aria-pressed={b.id === baseId}
            onClick={() => onBaseChange(b.id)}
            className={`min-h-16 rounded-lg border p-3 text-left ${b.id === baseId ? 'border-text bg-text text-surface' : 'border-line bg-surface'}`}
          >
            <span className="block font-semibold">{b.label}</span>
            <span className={`block text-xs ${b.id === baseId ? 'text-green-2' : 'text-muted'}`}>{b.description}</span>
          </button>
        ))}
      </div>
      <h3 className="label mt-4 text-muted">Ebenen</h3>
      <ul className="mt-1 divide-y divide-line">
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
      <h3 className="label mt-4 text-muted">Legende Topo-Karte</h3>
      <ul className="mt-2 space-y-2 text-sm">
        <li className="flex items-center gap-3">
          <svg width="44" height="10" aria-hidden>
            <line x1="2" y1="5" x2="42" y2="5" stroke={PAPER_LIGHT} strokeWidth="6" strokeLinecap="round" />
            <line x1="2" y1="5" x2="42" y2="5" stroke={TRAIL} strokeWidth="2.4" strokeDasharray="6 4" />
          </svg>
          Wanderweg, Pfad
        </li>
        <li className="flex items-center gap-3">
          <svg width="44" height="10" aria-hidden>
            <line x1="2" y1="5" x2="42" y2="5" stroke={PAPER_LIGHT} strokeWidth="5" strokeLinecap="round" />
            <line x1="2" y1="5" x2="42" y2="5" stroke={INK_MUTED} strokeWidth="1.8" strokeDasharray="10 4" />
          </svg>
          Feld- und Waldweg
        </li>
        <li className="flex items-center gap-3">
          <svg width="44" height="10" aria-hidden>
            <line x1="2" y1="5" x2="42" y2="5" stroke={MARK} strokeWidth="3.5" opacity="0.6" />
          </svg>
          <span>
            Markierte Wanderroute (Ebene «Markierte Wanderrouten», Farbe nach Netz;{' '}
            <a href="https://hiking.waymarkedtrails.org" target="_blank" rel="noopener" className="underline">
              Legende
            </a>
            )
          </span>
        </li>
        <li className="flex items-center gap-3">
          <svg width="44" height="10" aria-hidden>
            <line x1="2" y1="5" x2="42" y2="5" stroke={CONTOUR} strokeWidth="1.1" />
          </svg>
          Höhenlinie (beschriftet in m ü. M.)
        </li>
      </ul>
      <p className="mt-3 text-xs text-muted">
        Wege stammen aus OpenStreetMap. Ob ein Weg offiziell markiert, gesperrt oder anspruchsvoll ist, sagt die Linie allein nicht:
        vor Ort gelten die Wegweiser.
      </p>
    </Dialog>
  )
}
