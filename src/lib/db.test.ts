import 'fake-indexeddb/auto'
import { describe, expect, it } from 'vitest'
import { getSetting, setSetting } from './db'

describe('settings', () => {
  it('liefert den Fallback, wenn nichts gespeichert ist', async () => {
    expect(await getSetting('fehlt', 42)).toBe(42)
  })

  it('speichert und liest Werte', async () => {
    await setSetting('ansicht', { zoom: 8 })
    expect(await getSetting('ansicht', null)).toEqual({ zoom: 8 })
  })
})
