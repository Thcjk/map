import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { APP_NAME } from '../config'
import { useCloud } from '../cloud/CloudContext'
import { createCollection, deleteCollection, listCollections, toggleTourInCollection } from '../lib/collections'
import type { Collection, Tour } from '../lib/db'
import { downloadFile, slug } from '../lib/download'
import PageFrame from '../components/PageFrame'
import { formatHm, formatKm } from '../lib/format'
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

  const chip = (on: boolean) => `btn btn-sm ${on ? 'btn-primary' : 'btn-quiet'}`

  return (
    <PageFrame sheet="03" title="Touren" meta={tours ? `${tours.length} geplant` : undefined}>
      <div role="tablist" aria-label="Touren" className="segmented">
        {(
          [
            ['planned', 'Geplant'],
            ['done', 'Erledigt'],
          ] as const
        ).map(([id, text]) => (
          <button key={id} type="button" role="tab" aria-selected={tab === id} onClick={() => setTab(id)}>
            {text}
          </button>
        ))}
      </div>
      {tab === 'done' ? (
        <ActivitiesList />
      ) : (
        <>
          <Link to="/?plan=1" className="btn btn-primary mt-4 w-full">
            Neue Route planen
          </Link>

          {(collections.length > 0 || (tours?.length ?? 0) > 0) && (
            <div className="mt-4 flex flex-wrap gap-2" role="group" aria-label="Sammlungen">
              <button type="button" aria-pressed={!active} onClick={() => setActive(null)} className={chip(!active)}>
                Alle
              </button>
              {collections.map((c) => (
                <button key={c.id} type="button" aria-pressed={active === c.id} onClick={() => setActive(c.id)} className={chip(active === c.id)}>
                  {c.name} · {c.tourIds.length}
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
                <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Neue Sammlung" aria-label="Neue Sammlung" className="field min-h-10! w-36 rounded-r-none! border-line! text-sm!" />
                <button type="submit" className="btn btn-sm btn-quiet rounded-l-none! border-l-0!" aria-label="Sammlung anlegen">
                  +
                </button>
              </form>
            </div>
          )}
          {current && (
            <button
              type="button"
              onClick={async () => {
                if (!confirm(`Sammlung «${current.name}» löschen? Die Touren bleiben erhalten.`)) return
                await deleteCollection(current.id)
                setActive(null)
                await reload()
              }}
              className="btn btn-danger btn-sm mt-1"
            >
              Sammlung löschen
            </button>
          )}

          {shown?.length === 0 && (
            <p className="mt-6 text-muted">
              {current ? 'In dieser Sammlung sind noch keine Touren.' : 'Noch keine Touren gespeichert. Plane eine Route und tippe auf «Speichern», oder lade einen Fernweg.'}
            </p>
          )}
          <ul className="mt-4 space-y-3">
            {shown?.map((t) => (
              <li key={t.id} className="card p-3">
                <Link to={`/?tour=${t.id}`} className="block">
                  <h2 className="text-lg font-bold">
                    {t.name}
                    {t.isPublic && <span className="label ml-2 text-[10px]! text-green-5">öffentlich</span>}
                  </h2>
                  <p className="tabular mt-1 text-sm text-muted">
                    {formatKm(t.distance)} · bergauf {formatHm(t.ascent)} · bergab {formatHm(t.descent)} · {formatDuration(t.duration)}
                    {t.stages && t.stages.cuts.length > 0 && ` · ${t.stages.cuts.length + 1} Etappen`}
                  </p>
                </Link>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Link to={`/?tour=${t.id}`} className="btn btn-sm btn-primary">
                    Auf Karte
                  </Link>
                  <button
                    type="button"
                    onClick={() => downloadFile(`${slug(t.name)}.gpx`, toGpx(t.name, t.points, t.plan.kind === 'waypoints' ? t.plan.waypoints : [], APP_NAME), 'application/gpx+xml')}
                    className="btn btn-sm btn-quiet"
                  >
                    GPX
                  </button>
                  {collections.length > 0 && (
                    <button type="button" aria-expanded={menu === t.id} onClick={() => setMenu(menu === t.id ? null : t.id)} className="btn btn-sm btn-quiet">
                      Sammlung
                    </button>
                  )}
                  {cloud.email && (
                    <button type="button" onClick={() => void share(t)} className="btn btn-sm btn-quiet">
                      {copied === t.id ? 'Link kopiert' : 'Teilen'}
                    </button>
                  )}
                  <button type="button" onClick={() => void remove(t)} className="btn btn-sm btn-danger ml-auto">
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
                            className={chip(inside)}
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
                  <button
                    type="button"
                    onClick={async () => {
                      await setTourPublic(t.id, false)
                      await reload()
                    }}
                    className="mt-2 min-h-10 text-sm text-muted underline"
                  >
                    Nicht mehr öffentlich teilen
                  </button>
                )}
              </li>
            ))}
          </ul>
          {!cloud.email && cloud.configured && (
            <p className="mt-6 text-sm text-muted">
              Melde dich unter <Link to="/mehr" className="underline">Mehr</Link> an, um Touren auf allen Geräten zu haben und per Link zu teilen.
            </p>
          )}
        </>
      )}
    </PageFrame>
  )
}
