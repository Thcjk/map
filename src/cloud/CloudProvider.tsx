import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { getSetting } from '../lib/db'
import { cloudConfigured, getSupabase } from './client'
import { CloudContext, type CloudState } from './CloudContext'
import { syncAll } from './sync'

const INTERVAL_MS = 5 * 60 * 1000
const CHANGE_DEBOUNCE_MS = 3000

/** Login-Zustand und automatischer Abgleich (beim Start, nach Änderungen, wieder online, alle 5 min). */
export default function CloudProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<{ id: string; email: string | null } | null>(null)
  const [status, setStatus] = useState<CloudState['status']>('idle')
  const [error, setError] = useState<string | null>(null)
  const [lastSync, setLastSync] = useState<number | null>(null)
  const running = useRef(false)

  useEffect(() => {
    if (!cloudConfigured) return
    void getSetting<number | null>('sync.lastAt', null).then(setLastSync)
    let unsub: (() => void) | undefined
    void getSupabase().then((sb) => {
      void sb.auth.getSession().then(({ data }) => {
        const u = data.session?.user
        setUser(u ? { id: u.id, email: u.email ?? null } : null)
      })
      const { data } = sb.auth.onAuthStateChange((_e, session) => {
        const u = session?.user
        setUser(u ? { id: u.id, email: u.email ?? null } : null)
      })
      unsub = () => data.subscription.unsubscribe()
    })
    return () => unsub?.()
  }, [])

  const syncNow = useCallback(async () => {
    if (!user || running.current) return
    if (!navigator.onLine) {
      setStatus('offline')
      return
    }
    running.current = true
    setStatus('syncing')
    try {
      await syncAll(await getSupabase(), user.id)
      setLastSync(Date.now())
      setError(null)
      setStatus('idle')
    } catch (e) {
      setError((e as Error).message)
      setStatus('error')
    } finally {
      running.current = false
    }
  }, [user])

  useEffect(() => {
    if (!user) return
    void syncNow()
    let timer: ReturnType<typeof setTimeout> | undefined
    const onChange = () => {
      clearTimeout(timer)
      timer = setTimeout(() => void syncNow(), CHANGE_DEBOUNCE_MS)
    }
    const onOnline = () => void syncNow()
    const interval = setInterval(() => document.visibilityState === 'visible' && void syncNow(), INTERVAL_MS)
    window.addEventListener('local-data-changed', onChange)
    window.addEventListener('online', onOnline)
    return () => {
      clearTimeout(timer)
      clearInterval(interval)
      window.removeEventListener('local-data-changed', onChange)
      window.removeEventListener('online', onOnline)
    }
  }, [user, syncNow])

  const value = useMemo<CloudState>(
    () => ({
      configured: cloudConfigured,
      email: user?.email ?? null,
      status,
      error,
      lastSync,
      syncNow,
      async signIn(email: string) {
        const sb = await getSupabase()
        const { error } = await sb.auth.signInWithOtp({
          email,
          options: { emailRedirectTo: `${location.origin}${import.meta.env.BASE_URL}konto` },
        })
        if (error) throw error
      },
      async signOut() {
        const sb = await getSupabase()
        await sb.auth.signOut()
      },
    }),
    [user, status, error, lastSync, syncNow],
  )

  return <CloudContext.Provider value={value}>{children}</CloudContext.Provider>
}
