import { useEffect, useRef, useState } from 'react'
import { APP_NAME } from '../config'
import { activityFromGpx, deleteActivity, listActivities, saveActivity } from '../lib/activities'
import type { Activity } from '../lib/db'
import { downloadFile, slug } from '../lib/download'
import { formatHm, formatKm } from '../lib/format'
import { parseGpx, toGpx } from '../lib/gpx'
import { formatDuration } from '../lib/hikingTime'

const dateFmt = new Intl.DateTimeFormat('de-CH', { dateStyle: 'medium' })

/** Erledigte Touren: aufgezeichnet oder als GPX von anderen Geräten importiert. */
export default function ActivitiesList() {
  const [items, setItems] = useState<Activity[] | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const fileInput = useRef<HTMLInputElement>(null)

  const reload = () => listActivities().then(setItems)
  useEffect(() => void reload(), [])

  const importFiles = async (files: FileList) => {
    let ok = 0
    const failed: string[] = []
    for (const f of files) {
      try {
        await saveActivity(activityFromGpx(parseGpx(await f.text())))
        ok++
      } catch {
        failed.push(f.name)
      }
    }
    setMessage(`${ok} importiert${failed.length ? `, nicht lesbar: ${failed.join(', ')}` : ''}.`)
    await reload()
  }

  return (
    <div>
      <input
        ref={fileInput}
        type="file"
        multiple
        accept=".gpx,application/gpx+xml"
        className="hidden"
        onChange={(e) => {
          if (e.target.files?.length) void importFiles(e.target.files)
          e.target.value = ''
        }}
      />
      <button type="button" onClick={() => fileInput.current?.click()} className="btn mt-4 w-full">
        GPX von Uhr oder App importieren
      </button>
      {message && <p role="status" className="mt-2 text-sm">{message}</p>}
      {items?.length === 0 && (
        <p className="mt-4 text-muted">Noch keine erledigten Touren. Tippe auf der Karte auf «Aufzeichnen» oder importiere GPX-Dateien.</p>
      )}
      <ul className="mt-4 space-y-3">
        {items?.map((a) => (
          <li key={a.id} className="card p-3">
            <p className="label text-green-5">
              {dateFmt.format(a.startedAt)} · {a.source === 'recorded' ? 'aufgezeichnet' : 'importiert'}
            </p>
            <h2 className="mt-1 text-lg font-bold">{a.name}</h2>
            <p className="tabular mt-1 text-sm text-muted">
              {formatKm(a.distance)} · bergauf {formatHm(a.ascent)} · bergab {formatHm(a.descent)}
              {a.durationMs !== null && ` · ${formatDuration(a.durationMs / 60000)}`}
            </p>
            <div className="mt-3 flex gap-2">
              <button type="button" onClick={() => downloadFile(`${slug(a.name)}.gpx`, toGpx(a.name, a.points, [], APP_NAME, a.times), 'application/gpx+xml')} className="btn btn-sm btn-quiet">
                GPX
              </button>
              <button
                type="button"
                onClick={async () => {
                  if (!confirm(`«${a.name}» wirklich löschen?`)) return
                  await deleteActivity(a.id)
                  await reload()
                }}
                className="btn btn-sm btn-danger ml-auto"
              >
                Löschen
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
