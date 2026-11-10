import { escapeRegex, overpass, type OsmElement } from './overpass'

export interface TrailHit {
  id: number
  name: string
  ref?: string
  network?: string
  from?: string
  to?: string
  center?: [number, number]
}

const NETWORK_RANK: Record<string, number> = { iwn: 0, nwn: 1, rwn: 2, lwn: 3 }
export const NETWORK_LABELS: Record<string, string> = {
  iwn: 'international',
  nwn: 'national',
  rwn: 'regional',
  lwn: 'lokal',
}

const bboxStr = ([w, s, e, n]: [number, number, number, number]) => `${s},${w},${n},${e}`

export function buildSearchQuery(f: { name?: string; ref?: string; networks?: boolean }, bbox: [number, number, number, number]) {
  let filter = '["type"="route"]["route"="hiking"]'
  if (f.networks) filter += '["network"~"^(iwn|nwn|rwn)$"]'
  if (f.name) filter += `["name"~"${f.name}",i]`
  if (f.ref) filter += `["ref"~"${f.ref}",i]`
  return `[out:json][timeout:40];relation${filter}(${bboxStr(bbox)});out tags center 60;`
}

export function parseHits(elements: OsmElement[]): TrailHit[] {
  return elements
    .filter((e) => e.type === 'relation' && e.tags)
    .map((e) => ({
      id: e.id,
      name: e.tags!.name ?? e.tags!.ref ?? `Relation ${e.id}`,
      ref: e.tags!.ref,
      network: e.tags!.network,
      from: e.tags!.from,
      to: e.tags!.to,
      center: e.center ? ([e.center.lon, e.center.lat] as [number, number]) : undefined,
    }))
    .sort(
      (a, b) =>
        (NETWORK_RANK[a.network ?? ''] ?? 9) - (NETWORK_RANK[b.network ?? ''] ?? 9) || a.name.localeCompare(b.name, 'de'),
    )
}

export async function searchTrails(
  f: { name?: string; ref?: string; networks?: boolean },
  bbox: [number, number, number, number],
  signal?: AbortSignal,
): Promise<TrailHit[]> {
  return parseHits(await overpass(buildSearchQuery(f, bbox), signal))
}

/** Freitextsuche des Nutzers: Name enthält den Text. */
export const userNameFilter = (text: string) => ({ name: escapeRegex(text.trim()), networks: true })

/** Relation mit allen Unterrelationen (bis 3 Ebenen) und Weggeometrie. */
export const relationQuery = (id: number) =>
  `[out:json][timeout:120][maxsize:268435456];relation(${id});(._;rel(r););(._;rel(r););(._;rel(r););out geom;`
