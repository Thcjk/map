import { describe, expect, it } from 'vitest'
import { buildSearchQuery, parseHits, userNameFilter } from './search'

describe('trail search', () => {
  it('baut eine Overpass-Abfrage mit BBox in s,w,n,e', () => {
    const q = buildSearchQuery({ ref: '^GR ?20$' }, [8.5, 41.3, 9.6, 42.7])
    expect(q).toContain('["ref"~"^GR ?20$",i]')
    expect(q).toContain('(41.3,8.5,42.7,9.6)')
  })

  it('maskiert Nutzereingaben', () => {
    expect(userNameFilter('Weg (Nord)').name).toBe('Weg \\(Nord\\)')
  })

  it('sortiert internationale Wege zuerst', () => {
    const hits = parseHits([
      { type: 'relation', id: 2, tags: { name: 'B', network: 'rwn' } },
      { type: 'relation', id: 1, tags: { name: 'A', network: 'iwn' }, center: { lat: 46, lon: 7 } },
    ])
    expect(hits.map((h) => h.id)).toEqual([1, 2])
    expect(hits[0].center).toEqual([7, 46])
  })
})
