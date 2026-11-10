import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useCloud } from '../cloud/CloudContext'

const timeFmt = new Intl.DateTimeFormat('de-CH', { dateStyle: 'short', timeStyle: 'short' })

export default function AccountPage() {
  const cloud = useCloud()
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  return (
    <div className="h-full overflow-y-auto px-4 py-6">
      <div className="mx-auto max-w-md">
        <h1 className="text-2xl font-bold">Konto</h1>
        <p className="mt-1 text-muted">
          Ohne Konto bleibt alles auf diesem Gerät. Mit Konto werden Touren, Etappenpläne und Sammlungen
          zwischen deinen Geräten abgeglichen; gespeichert wird immer zuerst lokal.
        </p>

        {!cloud.configured && (
          <p className="mt-6 rounded-xl border border-line bg-surface p-4">
            Der Cloud-Abgleich ist in dieser Installation noch nicht eingerichtet.
          </p>
        )}

        {cloud.configured && !cloud.email && (
          <form
            className="mt-6 space-y-3"
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
            <label className="block">
              <span className="text-sm text-muted">E-Mail-Adresse</span>
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 min-h-12 w-full rounded-xl border border-line bg-surface px-3"
              />
            </label>
            <button type="submit" className="min-h-12 w-full rounded-xl bg-accent font-bold text-bg">
              Anmeldelink senden
            </button>
            {sent && <p role="status" className="text-sm">Link verschickt. Öffne die E-Mail auf diesem Gerät, um dich anzumelden.</p>}
            {error && <p role="alert" className="text-sm text-danger">{error}</p>}
          </form>
        )}

        {cloud.email && (
          <div className="mt-6 space-y-3 rounded-xl border border-line bg-surface p-4">
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
              <button type="button" onClick={() => void cloud.syncNow()} className="min-h-11 flex-1 rounded-xl bg-accent font-semibold text-bg">
                Jetzt abgleichen
              </button>
              <button type="button" onClick={() => void cloud.signOut()} className="min-h-11 rounded-xl border border-line px-4">
                Abmelden
              </button>
            </div>
          </div>
        )}

        <Link to="/quellen" className="mt-8 flex min-h-12 items-center justify-between rounded-xl border border-line bg-surface px-4">
          Quellen & Lizenzen <span aria-hidden>›</span>
        </Link>
      </div>
    </div>
  )
}
