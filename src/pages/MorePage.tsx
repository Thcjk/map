import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useCloud } from '../cloud/CloudContext'
import PageFrame from '../components/PageFrame'
import type { OfflineRegion } from '../lib/db'
import { deleteRegion, formatBytes, listRegions } from '../offline/store'

const timeFmt = new Intl.DateTimeFormat('de-CH', { dateStyle: 'short', timeStyle: 'short' })

function Account() {
  const cloud = useCloud()
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!cloud.configured) return <p className="card p-3 text-sm">Der Abgleich zwischen Geräten ist in dieser Installation nicht eingerichtet. Alles bleibt auf diesem Gerät.</p>

  if (cloud.email)
    return (
      <div className="card space-y-3 p-3">
        <p>
          Angemeldet als <strong>{cloud.email}</strong>
        </p>
        <p className="text-sm text-muted" role="status">
          {cloud.status === 'syncing' && 'Abgleich läuft …'}
          {cloud.status === 'offline' && 'Offline – der Abgleich startet, sobald du wieder online bist.'}
          {cloud.status === 'error' && <span className="text-danger">Abgleich fehlgeschlagen: {cloud.error}</span>}
          {cloud.status === 'idle' && (cloud.lastSync ? `Zuletzt abgeglichen: ${timeFmt.format(cloud.lastSync)}` : 'Noch nicht abgeglichen.')}
        </p>
        <div className="flex gap-2">
          <button type="button" onClick={() => void cloud.syncNow()} className="btn btn-primary flex-1">
            Jetzt abgleichen
          </button>
          <button type="button" onClick={() => void cloud.signOut()} className="btn">
            Abmelden
          </button>
        </div>
      </div>
    )

  return (
    <form
      className="space-y-2"
      onSubmit={async (e) => {
        e.preventDefault()
        setError(null)
        try {
          await cloud.signIn(email.trim())
          setSent(true)
        } catch (err) {
          setError((err as Error).message)
        }
      }}
    >
      <p className="text-sm text-muted">
        Ohne Konto bleibt alles auf diesem Gerät. Mit Konto werden geplante Touren, Etappen und Sammlungen zwischen deinen Geräten
        abgeglichen. Anmelden geht ohne Passwort: Du bekommst einen Link per E-Mail.
      </p>
      <input type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="E-Mail-Adresse" aria-label="E-Mail-Adresse" className="field" />
      <button type="submit" className="btn btn-primary w-full">
        Anmeldelink senden
      </button>
      {sent && <p role="status" className="text-sm">Link verschickt. Öffne die E-Mail auf diesem Gerät, um dich anzumelden.</p>}
      {error && <p role="alert" className="text-sm text-danger">{error}</p>}
    </form>
  )
}

function OfflineMaps() {
  const [regions, setRegions] = useState<OfflineRegion[] | null>(null)
  const [usage, setUsage] = useState<{ used: number; quota: number } | null>(null)

  const refresh = async () => {
    setRegions(await listRegions())
    const est = await navigator.storage?.estimate?.()
    if (est) setUsage({ used: est.usage ?? 0, quota: est.quota ?? 0 })
  }
  useEffect(() => void refresh(), [])

  return (
    <div>
      {regions?.length === 0 && (
        <p className="text-sm text-muted">
          Noch keine Karten heruntergeladen. Öffne eine Route auf der Karte, ziehe das Panel auf und wähle «Offline».
        </p>
      )}
      <ul className="divide-y divide-line">
        {regions?.map((r) => (
          <li key={r.id} className="flex items-center gap-2 py-2">
            <span className="min-w-0 flex-1">
              <span className="block truncate font-semibold">{r.name}</span>
              <span className="tabular block text-xs text-muted">
                ± {r.corridor / 1000} km · {formatBytes(r.bytes)}
              </span>
            </span>
            <button
              type="button"
              onClick={async () => {
                await deleteRegion(r.id)
                await refresh()
              }}
              className="btn btn-danger btn-sm"
            >
              Löschen
            </button>
          </li>
        ))}
      </ul>
      {usage && (
        <p className="tabular mt-2 text-xs text-muted">
          Speicher der App: {formatBytes(usage.used)} von {formatBytes(usage.quota)} belegt.
        </p>
      )}
    </div>
  )
}

export default function MorePage() {
  return (
    <PageFrame sheet="04" title="Mehr" meta="Konto · Offline · Quellen">
      <section>
        <h2 className="label text-muted">Konto und Abgleich</h2>
        <div className="mt-2">
          <Account />
        </div>
      </section>
      <section className="mt-8">
        <h2 className="label text-muted">Offline-Karten</h2>
        <div className="mt-2">
          <OfflineMaps />
        </div>
      </section>
      <section className="mt-8">
        <h2 className="label text-muted">Über die App</h2>
        <Link to="/quellen" className="card mt-2 flex min-h-12 items-center justify-between px-3">
          Quellen und Lizenzen <span aria-hidden>›</span>
        </Link>
        <p className="mt-3 text-xs text-muted">
          Karten und Routen sind Hilfsmittel. Wege können gesperrt, verlegt oder falsch erfasst sein: Vor Ort gelten Markierung,
          Wetter und der eigene Blick.
        </p>
      </section>
    </PageFrame>
  )
}
