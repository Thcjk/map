import { describe, expect, it } from 'vitest'
import { parseBRouter } from './brouter'

const header = ['Longitude', 'Latitude', 'Elevation', 'Distance', 'CostPerKm', 'ElevCost', 'TurnCost', 'NodeCost', 'InitialCost', 'WayTags', 'NodeTags', 'Time', 'Energy']

describe('parseBRouter', () => {
  it('liest Geometrie, Höhe und Wegabschnitte', () => {
    const leg = parseBRouter({
      features: [
        {
          geometry: {
            coordinates: [
              [7.0, 46.0, 1000],
              [7.001, 46.0, 1005],
              [7.002, 46.0, 1010],
              [7.003, 46.0, 1020],
            ],
          },
          properties: {
            messages: [
              header,
              ['7001000', '46000000', '1005', '77', '', '', '', '', '', 'highway=track surface=gravel', '', '', ''],
              ['7002000', '46000000', '1010', '77', '', '', '', '', '', 'highway=track surface=compacted', '', '', ''],
              ['7003000', '46000000', '1020', '77', '', '', '', '', '', 'highway=path sac_scale=mountain_hiking', '', '', ''],
            ],
          },
        },
      ],
    })
    expect(leg.routed).toBe(true)
    expect(leg.points).toHaveLength(4)
    expect(leg.points[3]).toEqual([7.003, 46.0, 1020])
    expect(leg.ways).toEqual([
      { from: 0, to: 2, surface: 'gravel', sac: null },
      { from: 2, to: 3, surface: 'path', sac: 'T2' },
    ])
  })
})
