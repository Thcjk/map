import type { LngLat, RoutePoint } from '../lib/geo'
import type { WaySegment } from '../routing/types'

/**
 * Planungszustand. Entweder eine geroutete Planung aus Wegpunkten
 * oder ein importierter Track mit fester Geometrie.
 */
export type Plan =
  | { kind: 'waypoints'; waypoints: LngLat[] }
  | { kind: 'track'; points: RoutePoint[]; ways: WaySegment[] }

export interface PlannerState {
  past: Plan[]
  present: Plan
  future: Plan[]
}

export type PlannerAction =
  | { type: 'add'; at: LngLat }
  | { type: 'insert'; index: number; at: LngLat }
  | { type: 'move'; index: number; to: LngLat }
  | { type: 'remove'; index: number }
  | { type: 'reverse' }
  | { type: 'clear' }
  | { type: 'load'; plan: Plan }
  | { type: 'undo' }
  | { type: 'redo' }

export const EMPTY_PLAN: Plan = { kind: 'waypoints', waypoints: [] }
export const initialPlannerState: PlannerState = { past: [], present: EMPTY_PLAN, future: [] }

const MAX_HISTORY = 100

function apply(plan: Plan, action: PlannerAction): Plan {
  if (action.type === 'clear') return EMPTY_PLAN
  if (action.type === 'load') return action.plan
  if (plan.kind === 'track') {
    if (action.type === 'reverse')
      return { ...plan, points: [...plan.points].reverse(), ways: reverseWays(plan.ways, plan.points.length) }
    // Ein importierter Track wird beim ersten Antippen durch eine neue Planung ersetzt.
    if (action.type === 'add') return { kind: 'waypoints', waypoints: [action.at] }
    return plan
  }
  const w = plan.waypoints
  switch (action.type) {
    case 'add':
      return { kind: 'waypoints', waypoints: [...w, action.at] }
    case 'insert':
      return { kind: 'waypoints', waypoints: [...w.slice(0, action.index), action.at, ...w.slice(action.index)] }
    case 'move':
      return { kind: 'waypoints', waypoints: w.map((p, i) => (i === action.index ? action.to : p)) }
    case 'remove':
      return { kind: 'waypoints', waypoints: w.filter((_, i) => i !== action.index) }
    case 'reverse':
      return { kind: 'waypoints', waypoints: [...w].reverse() }
    default:
      return plan
  }
}

function reverseWays(ways: WaySegment[], n: number): WaySegment[] {
  return ways.map((s) => ({ ...s, from: n - 1 - s.to, to: n - 1 - s.from })).reverse()
}

export function plannerReducer(state: PlannerState, action: PlannerAction): PlannerState {
  if (action.type === 'undo') {
    if (!state.past.length) return state
    return {
      past: state.past.slice(0, -1),
      present: state.past[state.past.length - 1],
      future: [state.present, ...state.future],
    }
  }
  if (action.type === 'redo') {
    if (!state.future.length) return state
    return { past: [...state.past, state.present], present: state.future[0], future: state.future.slice(1) }
  }
  const next = apply(state.present, action)
  if (next === state.present) return state
  return { past: [...state.past, state.present].slice(-MAX_HISTORY), present: next, future: [] }
}
