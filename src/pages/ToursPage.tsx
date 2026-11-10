import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { APP_NAME } from '../config'
import { useCloud } from '../cloud/CloudContext'
import { createCollection, deleteCollection, listCollections, toggleTourInCollection } from '../lib/collections'
import type { Collection, Tour } from '../lib/db'
import { downloadFile, slug } from '../lib/download'
import { formatKm, formatM } from '../lib/format'
import { toGpx } from '../lib/gpx'
import { formatDuration } from '../lib/hikingTime'
import { deleteTour, listTours, setTourPublic } from '../lib/tours'
import ActivitiesList from './ActivitiesList'

const shareUrl = (id: string) => `${location.origin}${import.meta.env.BASE_URL}teilen/${id}`

export default function ToursPage() {
  const cloud = useCloud()
  const [tours, setTours] = useState<Tour[] | null>(null)
  const [collections, setCollections] = useState<Collection[]>([])
  const [active, setActive] = useState<string | null>(null)
  const [newName, setNewName] = useState('')
  const [menu, setMenu] = useState<string | null>(null)
  const [copied, setCopied] = useState<string | null>(null)
  const [tab, setTab] = useState<'planned' | 'done'>('planned')

  const reload = useCallback(async () => {
    setTours(await listTours())
    setCollections(await listCollections())
  }, [])

  useEffect(() => {
    void reload()
    // Nach einem Cloud-Abgleich neu laden
    const onFocus = () => void reload()
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [reload, cloud.lastSync])

  const remove = async (t: Tour) => {
    if (!confirm(`«${t.name}» wirklich löschen?`)) return
    await deleteTour(t.id)
    await reload()
  }

  const share = async (t: Tour) => {
    if (!t.isPublic) await setTourPublic(t.id, true)
    const url = shareUrl(t.id)
    if (navigator.share) await navigator.share({ title: t.name, url }).catch(() => undefined)
    else {
      await navigator.clipboard.writeText(url)
      setCopied(t.id)
    }
    await reload()
  }

  const current = collections.find((c) => c.id === active)
  const shown = current ? tours?.filter((t) => current.tourIds.includes(t.id)) : tours

  return (
    <div className="h-full overflow-y-auto px-4 py-6">
      <div className="mx-auto max-w-2xl">
        <h1 className="text-2xl font-bold">Meine Touren</h1>
        <div role="tablist" aria-label="Touren" className="mt-3 grid grid-cols-2 border-b border-text">
          {(
            [
              ['planned', 'Geplant'],
              ['done', 'Erledigt'],
            ] as const
          ).map(([id, text]) => (
            <button key={id} type="button" role="tab" aria-selected={tab === id} onClick={() => setTab(id)} className={`label min-h-11 text-[12px]! ${tab === id ? 'bg-text text-surface' : 'text-muted'}`}>
              {text}
            </button>
          ))}
        </div>
        {tab === 'done' ? (
          <ActivitiesList />
        ) : (
          <>

        <div className="mt-4 flex flex-wrap gap-2" role="group" aria-label="Sammlungen">
          <button type="button" aria-pressed={!active} onClick={() => setActive(null)} className={`min-h-10 rounded-full border px-4 ${!active ? 'border-accent text-accent' : 'border-line text-muted'}`}>
            Alle
          </button>
          {collections.map((c) => (
            <button key={c.id} type="button" aria-pressed={active === c.id} onClick={() => setActive(c.id)} className={`min-h-10 rounded-full border px-4 ${active === c.id ? 'border-accent text-accent' : 'border-line text-muted'}`}>
              {c.name} <span className="tabular">{c.tourIds.length}</span>
            </button>
          ))}
          <form
            className="flex"
            onSubmit={async (e) => {
              e.preventDefault()
              if (!newName.trim()) return
              setActive(await createCollection(newName))
              setNewName('')
              await reload()
            }}
          >
            <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Neue Sammlung" aria-label="Neue Sammlung" className="min-h-10 w-36 rounded-l-full border border-line bg-surface px-3 text-sm" />
            <button type="submit" className="min-h-10 rounded-r-full border border-l-0 border-line px-3 text-accent" aria-label="Sammlung anlegen">
              +
            </button>
          </form>
        </div>
        {current && (
          <button
            type="button"
            onClick={async () => {
              if (!confirm(`Sammlung «${current.name}» löschen? Die Touren bleiben erhalten.`)) return
              await deleteCollection(current.id)
              setActive(null)
              await reload()
            }}
            className="mt-2 min-h-10 text-sm text-danger"
          >
            Sammlung löschen
          </button>
        )}

        {shown?.length === 0 && (
          <p className="mt-4 text-muted">
            {current ? 'In dieser Sammlung sind noch keine Touren.' : 'Noch keine Touren gespeichert. Plane eine Route auf der '}
            {!current && (
              <>
                <Link to="/" className="text-accent underline">Karte</Link> und tippe auf «Speichern».
              </>
            )}
          </p>
        )}
        <ul className="mt-4 space-y-3">
          {shown?.map((t) => (
            <li key={t.id} className="rounded-xl border border-line bg-surface p-4">
              <Link to={`/?tour=${t.id}`} className="block">
                <h2 className="text-lg font-semibold">
                  {t.name}
                  {t.isPublic && <span className="ml-2 rounded-md bg-surface-2 px-2 py-0.5 text-xs font-semibold text-accent">öffentlich</span>}
                </h2>
                <p className="tabular mt-1 text-muted">
                  {formatKm(t.distance)} · ↑ {formatM(t.ascent)} · ↓ {formatM(t.descent)} · {formatDuration(t.duration)}
                  {t.stages && ` · ${t.stages.cuts.length + 1} Etappen`}
                </p>
              </Link>
              <div className="mt-3 flex flex-wrap gap-2">
                <Link to={`/?tour=${t.id}`} className="flex min-h-11 items-center rounded-xl bg-accent px-4 font-semibold text-bg">
                  Öffnen
                </Link>
                <button
                  type="button"
                  onClick={() => downloadFile(`${slug(t.name)}.gpx`, toGpx(t.name, t.points, t.plan.kind === 'waypoints' ? t.plan.waypoints : [], APP_NAME), 'application/gpx+xml')}
                  className="min-h-11 rounded-xl border border-line px-4"
                >
                  GPX
                </button>
                {collections.length > 0 && (
                  <button type="button" aria-expanded={menu === t.id} onClick={() => setMenu(menu === t.id ? null : t.id)} className="min-h-11 rounded-xl border border-line px-4">
                    Sammlungen
                  </button>
                )}
                {cloud.email && (
                  <button type="button" onClick={() => void share(t)} className="min-h-11 rounded-xl border border-line px-4">
                    {copied === t.id ? 'Link kopiert' : 'Teilen'}
                  </button>
                )}
                <button type="button" onClick={() => void remove(t)} className="ml-auto min-h-11 rounded-xl px-4 text-danger">
                  Löschen
                </button>
              </div>
              {menu === t.id && (
                <ul className="mt-2 flex flex-wrap gap-2">
                  {collections.map((c) => {
                    const inside = c.tourIds.includes(t.id)
                    return (
                      <li key={c.id}>
                        <button
                          type="button"
                          aria-pressed={inside}
                          onClick={async () => {
                            await toggleTourInCollection(c.id, t.id)
                            await reload()
                          }}
                          className={`min-h-10 rounded-full border px-3 text-sm ${inside ? 'border-accent text-accent' : 'border-line text-muted'}`}
                        >
                          {inside ? '✓ ' : '+ '}
                          {c.name}
                        </button>
                      </li>
                    )
                  })}
                </ul>
              )}
              {t.isPublic && (
                <button type="button" onClick={async () => { await setTourPublic(t.id, false); await reload() }} className="mt-2 min-h-10 text-sm text-muted underline">
                  Nicht mehr öffentlich teilen
                </button>
              )}
            </li>
          ))}
        </ul>
        {!cloud.email && cloud.configured && (
          <p className="mt-6 text-sm text-muted">
            Melde dich unter <Link to="/konto" className="text-accent underline">Konto</Link> an, um Touren auf allen Geräten zu haben und per Link zu teilen.
          </p>
        )}
          </>
        )}
      </div>
    </div>
  )
}
