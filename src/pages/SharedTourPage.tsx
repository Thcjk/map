import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { cloudConfigured, getSupabase } from '../cloud/client'
import { fetchPublicTour } from '../cloud/sync'
import PageFrame from '../components/PageFrame'
import { formatHm, formatKm } from '../lib/format'
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
    <PageFrame sheet="06" title="Geteilte Tour">
      {error && <p role="alert" className="card p-3">{error}</p>}
      {!tour && !error && <p role="status" className="label text-muted">Tour wird geladen …</p>}
      {tour && (
        <div className="card p-4">
          <h2 className="text-xl font-bold">{tour.name}</h2>
          <p className="tabular mt-2">
            {formatKm(tour.distance)} · bergauf {formatHm(tour.ascent)} · bergab {formatHm(tour.descent)} · {formatDuration(tour.duration)}
          </p>
          <button type="button" onClick={() => void copy()} className="btn btn-primary mt-4 w-full">
            In meine Touren übernehmen
          </button>
        </div>
      )}
    </PageFrame>
  )
}
