import Dialog from '../components/Dialog'
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
    </Dialog>
  )
}
