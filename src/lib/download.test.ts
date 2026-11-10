import { describe, expect, it } from 'vitest'
import { slug } from './download'

describe('slug', () => {
  it('macht lesbare Dateinamen', () => {
    expect(slug('Via Alpina, Etappe 1')).toBe('via-alpina-etappe-1')
    expect(slug('Grosse Tour über den Gotthard')).toBe('grosse-tour-ueber-den-gotthard')
    expect(slug('???')).toBe('tour')
  })
})
