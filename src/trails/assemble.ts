import { distance, type LngLat, type RoutePoint } from '../lib/geo'
import type { OsmElement } from './overpass'

/** Rollen, die nicht zum Hauptweg gehören. */
const SKIP_ROLES = /^(alternative|excursion|approach|connection|link|spur)$/

/**
 * Setzt die Wege einer (Super-)Routenrelation zu einer durchgehenden Linie zusammen.
 * Reihenfolge = Reihenfolge der Mitglieder (Unterrelationen werden rekursiv aufgelöst);
 * jeder Weg wird so gedreht, dass er möglichst nahtlos an den vorherigen anschliesst.
 */
export function assembleRelation(rootId: number, elements: OsmElement[]): { points: RoutePoint[]; gaps: number } {
  const relations = new Map(elements.filter((e) => e.type === 'relation').map((r) => [r.id, r]))
  const ways: LngLat[][] = []
  const visit = (id: number, seen: Set<number>) => {
    const rel = relations.get(id)
    if (!rel || seen.has(id)) return
    seen.add(id)
    for (const m of rel.members ?? []) {
      if (SKIP_ROLES.test(m.role)) continue
      if (m.type === 'relation') visit(m.ref, seen)
      else if (m.type === 'way' && m.geometry?.length) ways.push(m.geometry.map((g) => [g.lon, g.lat]))
    }
  }
  visit(rootId, new Set())
  return chainWays(ways)
}

/** Wege verketten; liefert die Linie und die Anzahl Lücken über 200 m. */
export function chainWays(ways: LngLat[][]): { points: RoutePoint[]; gaps: number } {
  if (!ways.length) return { points: [], gaps: 0 }
  const line: LngLat[] = []
  let gaps = 0
  ways.forEach((w, i) => {
    let way = w
    if (i === 0) {
      // Ersten Weg so drehen, dass sein Ende zum nächsten Weg zeigt.
      const next = ways[1]
      if (next) {
        const endD = Math.min(distance(w[w.length - 1], next[0]), distance(w[w.length - 1], next[next.length - 1]))
        const startD = Math.min(distance(w[0], next[0]), distance(w[0], next[next.length - 1]))
        if (startD < endD) way = [...w].reverse()
      }
      line.push(...way)
      return
    }
    const end = line[line.length - 1]
    if (distance(end, w[w.length - 1]) < distance(end, w[0])) way = [...w].reverse()
    const joinD = distance(end, way[0])
    if (joinD > 200) gaps++
    line.push(...(joinD < 1 ? way.slice(1) : way))
  })
  return { points: line.map(([lng, lat]) => [lng, lat, null]), gaps }
}
