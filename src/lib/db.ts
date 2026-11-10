import Dexie, { type EntityTable } from 'dexie'

/** Einfache Schlüssel-Wert-Einstellungen (z. B. letzte Kartenansicht, gewählter Layer). */
export interface Setting {
  key: string
  value: unknown
}

export const db = new Dexie('wanderapp') as Dexie & {
  settings: EntityTable<Setting, 'key'>
}

db.version(1).stores({
  settings: 'key',
})

export async function getSetting<T>(key: string, fallback: T): Promise<T> {
  const row = await db.settings.get(key)
  return row === undefined ? fallback : (row.value as T)
}

export async function setSetting<T>(key: string, value: T): Promise<void> {
  await db.settings.put({ key, value })
}
