import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { cloudConfigured, getSupabase } from '../cloud/client'
import { fetchPublicTour } from '../cloud/sync'
import { formatKm, formatM } from '../lib/format'
import { formatDuration } from '../lib/hikingTime'
import { routeFromPoints } from '../routing/route'
import { saveTour } from '../lib/tours'

type Shared = NonNullable<Awaited<ReturnType<typeof fetchPublicTour>>>

/** Öffentlich geteilte Tour ansehen und als eigene Kopie übernehmen. */
export default function SharedTourPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [tour, setTour] = useState<Shared | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!cloudConfigured || !id) {
      setError('Geteilte Touren sind in dieser Installation nicht verfügbar.')
      return
    }
    getSupabase()
      .then((sb) => fetchPublicTour(sb, id))
      .then((t) => (t ? setTour(t) : setError('Diese Tour gibt es nicht oder sie ist nicht mehr öffentlich.')))
      .catch(() => setError('Die Tour konnte nicht geladen werden. Bist du online?'))
  }, [id])

  const copy = async () => {
    if (!tour) return
    const route = routeFromPoints(tour.data.points, tour.data.ways)
    const newId = await saveTour(tour.name, tour.data.plan, route, undefined, tour.data.stages ?? null)
    navigate(`/?tour=${newId}`)
  }

  return (
    <div className="h-full overflow-y-auto px-4 py-6">
      <div className="mx-auto max-w-md">
        {error && <p role="alert" className="rounded-xl border border-line bg-surface p-4">{error}</p>}
        {!tour && !error && <p role="status" className="text-muted">Tour wird geladen …</p>}
        {tour && (
          <div className="rounded-xl border border-line bg-surface p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-accent">Geteilte Tour</p>
            <h1 className="mt-1 text-2xl font-bold">{tour.name}</h1>
            <p className="tabular mt-2 text-lg">
              {formatKm(tour.distance)} · ↑ {formatM(tour.ascent)} · ↓ {formatM(tour.descent)} · {formatDuration(tour.duration)}
            </p>
            <button type="button" onClick={() => void copy()} className="mt-4 min-h-12 w-full rounded-xl bg-accent font-bold text-bg">
              In meine Touren übernehmen und öffnen
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
