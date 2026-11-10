import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { APP_NAME } from '../config'
import type { Tour } from '../lib/db'
import { downloadFile, slug } from '../lib/download'
import { formatKm, formatM } from '../lib/format'
import { toGpx } from '../lib/gpx'
import { formatDuration } from '../lib/hikingTime'
import { deleteTour, listTours } from '../lib/tours'

export default function ToursPage() {
  const [tours, setTours] = useState<Tour[] | null>(null)

  useEffect(() => {
    void listTours().then(setTours)
  }, [])

  const remove = async (t: Tour) => {
    if (!confirm(`«${t.name}» wirklich löschen?`)) return
    await deleteTour(t.id)
    setTours(await listTours())
  }

  return (
    <div className="h-full overflow-y-auto px-4 py-6">
      <div className="mx-auto max-w-2xl">
        <h1 className="text-2xl font-bold">Meine Touren</h1>
        {tours?.length === 0 && (
          <p className="mt-4 text-muted">
            Noch keine Touren gespeichert. Plane eine Route auf der{' '}
            <Link to="/" className="text-accent underline">Karte</Link> und tippe auf «Speichern».
          </p>
        )}
        <ul className="mt-4 space-y-3">
          {tours?.map((t) => (
            <li key={t.id} className="rounded-xl border border-line bg-surface p-4">
              <Link to={`/?tour=${t.id}`} className="block">
                <h2 className="text-lg font-semibold">{t.name}</h2>
                <p className="tabular mt-1 text-muted">
                  {formatKm(t.distance)} · ↑ {formatM(t.ascent)} · ↓ {formatM(t.descent)} · {formatDuration(t.duration)}
                </p>
              </Link>
              <div className="mt-3 flex gap-2">
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
                <button type="button" onClick={() => void remove(t)} className="ml-auto min-h-11 rounded-xl px-4 text-danger">
                  Löschen
                </button>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
