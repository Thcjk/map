import { createContext, useContext } from 'react'

export interface CloudState {
  configured: boolean
  email: string | null
  status: 'idle' | 'syncing' | 'error' | 'offline'
  error: string | null
  lastSync: number | null
  signIn: (email: string) => Promise<void>
  signOut: () => Promise<void>
  syncNow: () => Promise<void>
}

export const CloudContext = createContext<CloudState | null>(null)

export function useCloud(): CloudState {
  const c = useContext(CloudContext)
  if (!c) throw new Error('CloudProvider fehlt')
  return c
}
