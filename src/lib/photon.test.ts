import { describe, expect, it } from 'vitest'
import { parsePhoton } from './photon'

describe('parsePhoton', () => {
  it('wandelt Features in Orte um und dreht den extent', () => {
    const places = parsePhoton({
      features: [
        {
          geometry: { coordinates: [7.44, 46.95] },
          properties: {
            osm_type: 'R',
            osm_id: 1,
            name: 'Bern',
            city: 'Bern',
            state: 'Bern',
            country: 'Schweiz',
            extent: [7.29, 46.99, 7.49, 46.91],
          },
        },
      ],
    })
    expect(places[0]).toMatchObject({
      name: 'Bern',
      detail: 'Bern, Schweiz',
      lng: 7.44,
      lat: 46.95,
      bbox: [7.29, 46.91, 7.49, 46.99],
    })
  })
})
