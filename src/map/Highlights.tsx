import { useEffect, useMemo, useRef, useState } from 'react'
import * as maplibregl from 'maplibre-gl'
import Dialog from '../components/Dialog'
import { db, type Highlight } from '../lib/db'
import type { LngLat } from '../lib/geo'
import { resizePhoto } from '../lib/image'
import { useMap } from './MapContext'

const dateFmt = new Intl.DateTimeFormat('de-CH', { dateStyle: 'medium', timeStyle: 'short' })

interface Props {
  /** Ort, an dem eine neue Notiz/ein Foto abgelegt werden soll (öffnet den Dialog). */
  request: LngLat | null
  onDone: () => void
}

/** Eigene Fotos und Notizen an Punkten auf der Karte (lokal gespeichert). */
export default function Highlights({ request, onDone }: Props) {
  const map = useMap()
  const [items, setItems] = useState<Highlight[]>([])
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
      el.setAttribute('aria-label', `Notiz: ${h.note || 'Foto'}`)
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
    setNote('')
    setPhoto(null)
    setError(null)
    onDone()
  }

  const save = async () => {
    if (!request || (!note.trim() && !photo)) return
    await db.highlights.put({ id: crypto.randomUUID(), lng: request[0], lat: request[1], note: note.trim(), photo: photo ?? undefined, createdAt: Date.now() })
    close()
    await reload()
  }

  return (
    <>
      {request && (
        <Dialog title="Notiz oder Foto" onClose={close}>
          <form
            onSubmit={(e) => {
              e.preventDefault()
              void save()
            }}
          >
            <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} placeholder="Notiz" aria-label="Notiz" className="field" />
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
              <button type="button" onClick={() => fileInput.current?.click()} className="btn flex-1">
                {photo ? 'Anderes Foto' : 'Foto wählen'}
              </button>
              <button type="submit" disabled={!note.trim() && !photo} className="btn btn-primary flex-1">
                Speichern
              </button>
            </div>
          </form>
        </Dialog>
      )}

      {open && (
        <Dialog title={dateFmt.format(open.createdAt)} onClose={() => setOpen(null)}>
          {openUrl && <img src={openUrl} alt={open.note || 'Foto'} className="max-h-[50vh] w-full border border-line object-contain" />}
          {open.note && <p className="mt-2 whitespace-pre-wrap">{open.note}</p>}
          <button
            type="button"
            onClick={async () => {
              if (!confirm('Eintrag wirklich löschen?')) return
              await db.highlights.delete(open.id)
              setOpen(null)
              await reload()
            }}
            className="btn btn-danger btn-sm mt-3"
          >
            Löschen
          </button>
        </Dialog>
      )}
    </>
  )
}
