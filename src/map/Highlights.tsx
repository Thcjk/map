import { useEffect, useMemo, useRef, useState } from 'react'
import * as maplibregl from 'maplibre-gl'
import { CloseIcon, StarIcon } from '../components/icons'
import { db, type Highlight } from '../lib/db'
import { resizePhoto } from '../lib/image'
import { useMap } from './MapContext'

const dateFmt = new Intl.DateTimeFormat('de-CH', { dateStyle: 'medium', timeStyle: 'short' })

/** Highlights: eigene Fotos und Notizen an Punkten auf der Karte (lokal gespeichert). */
export default function Highlights() {
  const map = useMap()
  const [items, setItems] = useState<Highlight[]>([])
  const [adding, setAdding] = useState(false)
  const [open, setOpen] = useState<Highlight | null>(null)
  const [note, setNote] = useState('')
  const [photo, setPhoto] = useState<Blob | null>(null)
  const [error, setError] = useState<string | null>(null)
  const fileInput = useRef<HTMLInputElement>(null)

  const reload = () => db.highlights.orderBy('createdAt').toArray().then(setItems)
  useEffect(() => void reload(), [])

  useEffect(() => {
    if (!map) return
    const markers = items.map((h) => {
      const el = document.createElement('button')
      el.type = 'button'
      el.className = 'highlight-marker'
      el.setAttribute('aria-label', `Highlight: ${h.note || 'Foto'}`)
      el.textContent = '★'
      el.addEventListener('click', (e) => {
        e.stopPropagation()
        setOpen(h)
      })
      return new maplibregl.Marker({ element: el }).setLngLat([h.lng, h.lat]).addTo(map)
    })
    return () => markers.forEach((m) => m.remove())
  }, [map, items])

  const photoUrl = useMemo(() => (photo ? URL.createObjectURL(photo) : null), [photo])
  const openUrl = useMemo(() => (open?.photo ? URL.createObjectURL(open.photo) : null), [open])
  useEffect(() => () => void (photoUrl && URL.revokeObjectURL(photoUrl)), [photoUrl])
  useEffect(() => () => void (openUrl && URL.revokeObjectURL(openUrl)), [openUrl])

  const close = () => {
    setAdding(false)
    setNote('')
    setPhoto(null)
    setError(null)
  }

  const save = async () => {
    if (!map || (!note.trim() && !photo)) return
    const c = map.getCenter()
    await db.highlights.put({ id: crypto.randomUUID(), lng: c.lng, lat: c.lat, note: note.trim(), photo: photo ?? undefined, createdAt: Date.now() })
    close()
    await reload()
  }

  const sheet = 'w-full rounded-t-2xl border border-text bg-surface p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] sm:w-96 sm:rounded-2xl'

  return (
    <>
      <button type="button" onClick={() => setAdding(true)} aria-label="Highlight hinzufügen" className="map-fab absolute right-2.5 top-[324px] z-10">
        <StarIcon />
      </button>

      {adding && (
        <div className="absolute inset-0 z-40 flex items-end bg-black/40 sm:items-center sm:justify-center" onClick={close}>
          <form
            role="dialog"
            aria-label="Highlight hinzufügen"
            onClick={(e) => e.stopPropagation()}
            onSubmit={(e) => {
              e.preventDefault()
              void save()
            }}
            className={sheet}
          >
            <h2 className="text-lg font-bold">Highlight</h2>
            <p className="label mt-1 text-muted">Position: Fadenkreuz in der Kartenmitte</p>
            <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} placeholder="Notiz" aria-label="Notiz" className="mt-3 w-full rounded-xl border border-line bg-bg p-3" />
            <input
              ref={fileInput}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={async (e) => {
                const f = e.target.files?.[0]
                e.target.value = ''
                if (!f) return
                try {
                  setPhoto(await resizePhoto(f))
                  setError(null)
                } catch (err) {
                  setError((err as Error).message)
                }
              }}
            />
            {photoUrl && <img src={photoUrl} alt="Gewähltes Foto" className="mt-2 max-h-48 w-full border border-line object-cover" />}
            {error && <p role="alert" className="mt-2 text-sm text-danger">{error}</p>}
            <div className="mt-3 flex gap-2">
              <button type="button" onClick={() => fileInput.current?.click()} className="min-h-12 flex-1 rounded-xl border border-text font-semibold">
                {photo ? 'Anderes Foto' : 'Foto wählen'}
              </button>
              <button type="submit" disabled={!note.trim() && !photo} className="min-h-12 flex-1 rounded-xl bg-accent font-bold text-bg disabled:opacity-40">
                Speichern
              </button>
            </div>
          </form>
        </div>
      )}

      {open && (
        <div className="absolute inset-0 z-40 flex items-end bg-black/40 sm:items-center sm:justify-center" onClick={() => setOpen(null)}>
          <section role="dialog" aria-label="Highlight" onClick={(e) => e.stopPropagation()} className={sheet}>
            <div className="flex items-center justify-between">
              <p className="label text-green-5">{dateFmt.format(open.createdAt)}</p>
              <button type="button" onClick={() => setOpen(null)} aria-label="Schliessen" className="flex size-11 items-center justify-center text-muted">
                <CloseIcon />
              </button>
            </div>
            {openUrl && <img src={openUrl} alt={open.note || 'Foto'} className="max-h-[50vh] w-full border border-line object-contain" />}
            {open.note && <p className="mt-2 whitespace-pre-wrap">{open.note}</p>}
            <button
              type="button"
              onClick={async () => {
                if (!confirm('Highlight wirklich löschen?')) return
                await db.highlights.delete(open.id)
                setOpen(null)
                await reload()
              }}
              className="mt-3 min-h-11 text-danger"
            >
              Löschen
            </button>
          </section>
        </div>
      )}
    </>
  )
}
