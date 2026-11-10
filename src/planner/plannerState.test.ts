import { describe, expect, it } from 'vitest'
import { initialPlannerState, plannerReducer, type PlannerAction, type PlannerState } from './plannerState'

const run = (actions: PlannerAction[], s: PlannerState = initialPlannerState) => actions.reduce(plannerReducer, s)
const wps = (s: PlannerState) => (s.present.kind === 'waypoints' ? s.present.waypoints : null)

describe('plannerReducer', () => {
  it('setzt, verschiebt, fügt ein und löscht Wegpunkte', () => {
    const s = run([
      { type: 'add', at: [1, 1] },
      { type: 'add', at: [3, 3] },
      { type: 'insert', index: 1, at: [2, 2] },
      { type: 'move', index: 2, to: [4, 4] },
      { type: 'remove', index: 0 },
    ])
    expect(wps(s)).toEqual([
      [2, 2],
      [4, 4],
    ])
  })

  it('kann rückgängig machen und wiederholen', () => {
    const s = run([{ type: 'add', at: [1, 1] }, { type: 'add', at: [2, 2] }, { type: 'undo' }])
    expect(wps(s)).toEqual([[1, 1]])
    expect(wps(run([{ type: 'redo' }], s))).toEqual([
      [1, 1],
      [2, 2],
    ])
    // Neue Aktion verwirft die Wiederholen-Liste
    expect(run([{ type: 'add', at: [5, 5] }], s).future).toHaveLength(0)
  })

  it('dreht die Richtung um', () => {
    const s = run([{ type: 'add', at: [1, 1] }, { type: 'add', at: [2, 2] }, { type: 'reverse' }])
    expect(wps(s)).toEqual([
      [2, 2],
      [1, 1],
    ])
  })

  it('kehrt einen Track samt Wegabschnitten um', () => {
    const s = run([
      {
        type: 'load',
        plan: {
          kind: 'track',
          points: [[0, 0, 1], [1, 1, 2], [2, 2, 3]],
          ways: [
            { from: 0, to: 1, surface: 'paved', sac: null },
            { from: 1, to: 2, surface: 'path', sac: 'T2' },
          ],
        },
      },
      { type: 'reverse' },
    ])
    expect(s.present.kind === 'track' && s.present.ways).toEqual([
      { from: 0, to: 1, surface: 'path', sac: 'T2' },
      { from: 1, to: 2, surface: 'paved', sac: null },
    ])
  })
})
