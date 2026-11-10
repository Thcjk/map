import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Supabase ist optional: Ohne VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY läuft die App
 * rein lokal. Der Anon-Key ist für das Frontend gedacht; geschützt wird über RLS.
 * Niemals den service_role-Key ins Frontend!
 */
const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const cloudConfigured = Boolean(url && anonKey)

let client: Promise<SupabaseClient> | null = null

/** Client erst bei Bedarf laden, damit das Paket nicht im Start-Bundle landet. */
export function getSupabase(): Promise<SupabaseClient> {
  if (!cloudConfigured) return Promise.reject(new Error('Cloud ist nicht eingerichtet.'))
  client ??= import('@supabase/supabase-js').then(({ createClient }) =>
    createClient(url!, anonKey!, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: 'pkce' },
    }),
  )
  return client
}
