import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { listActivities } from '../lib/activities'
import { db, type Activity, type Trail } from '../lib/db'
import { slug } from '../lib/download'
import { formatKm } from '../lib/format'
import { useSetting } from '../lib/useSetting'
import { buildTrackIndex, coverage } from '../stickers/coverage'
import { MILESTONES } from '../stickers/milestones'
import type { MotifId } from '../stickers/motifs'
import { renderShareImage, shareImage } from '../stickers/share'
import Sticker, { UNLOCK_AT } from '../stickers/Sticker'
import { CATALOG } from '../trails/catalog'

const dateFmt = new Intl.DateTimeFormat('de-CH', { dateStyle: 'medium' })

interface Card {
  id: string
  motif: MotifId
  title: string
  detail: string
  progress: number
  /** Unterzeile im geteilten Bild: Datum · km */
  shareLine: string
  hint?: string
}

function StickerCard({ card, celebrate }: { card: Card; celebrate: boolean }) {
  const holder = useRef<HTMLDivElement>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const unlocked = card.progress >= UNLOCK_AT

  const share = async () => {
    const svg = holder.current?.querySelector('svg')
    if (!svg) return
    setBusy(true)
    setError(null)
    try {
      await shareImage(await renderShareImage(svg, card.title, card.shareLine), `${slug(card.title)}.png`, card.title)
    } catch (e) {
      setError((e as Error).message)
    }
    setBusy(false)
  }

  return (
    <li className="flex flex-col items-center border border-line bg-surface p-3 text-center">
      <div ref={holder}>
        <Sticker motif={card.motif} progress={card.progress} size={132} celebrate={celebrate} title={card.title} />
      </div>
      <h3 className="mt-1 text-sm font-semibold leading-tight">{card.title}</h3>
      <p className="label mt-1 text-[10px]! text-muted">{card.detail}</p>
      <div className="mt-2 h-1.5 w-full border border-line" aria-hidden>
        <div className="h-full bg-green-5" style={{ width: `${Math.min(100, (card.progress / UNLOCK_AT) * 100)}%` }} />
      </div>
      {card.hint && !unlocked && <p className="mt-2 text-xs text-muted">{card.hint}</p>}
      {unlocked && (
        <button type="button" disabled={busy} onClick={() => void share()} className="mt-2 min-h-10 w-full rounded-lg border border-text text-sm font-semibold disabled:opacity-50">
          {busy ? 'Bild wird erstellt …' : 'Als Bild teilen'}
        </button>
      )}
      {error && <p role="alert" className="mt-1 text-xs text-danger">{error}</p>}
    </li>
  )
}

export default function StickersPage() {
  const [activities, setActivities] = useState<Activity[] | null>(null)
  const [trails, setTrails] = useState<Trail[]>([])
  const [seen, setSeen, seenLoaded] = useSetting<string[]>('stickers.seen', [])

  useEffect(() => {
    void listActivities().then(setActivities)
    void db.trails.toArray().then(setTrails)
  }, [])

  const { trailCards, milestoneCards, totalKm } = useMemo(() => {
    const acts = activities ?? []
    const index = buildTrackIndex(acts.map((a) => a.points))
    const lastDate = acts.length ? dateFmt.format(Math.max(...acts.map((a) => a.startedAt))) : ''
    const forTrail = (t: Trail) => coverage(t.points, index)

    const curated: Card[] = CATALOG.map((c) => {
      const loaded = trails.filter((t) => t.catalogId === c.id).map(forTrail)
      const best = loaded.sort((a, b) => b.share - a.share)[0]
      return {
        id: c.id,
        motif: c.sticker,
        title: c.name,
        detail: best ? `${Math.round(best.share * 100)} % · ${formatKm(best.coveredM)} von ${formatKm(best.totalM)}` : c.marking,
        progress: best?.share ?? 0,
        shareLine: best ? `${lastDate} · ${formatKm(best.totalM)}` : '',
        hint: best ? undefined : 'Weg unter «Fernwege» laden, dann zählt deine Strecke.',
      }
    })
    const other: Card[] = trails
      .filter((t) => !t.catalogId)
      .map((t) => {
        const c = forTrail(t)
        return {
          id: `trail-${t.id}`,
          motif: 'signpost' as const,
          title: t.name,
          detail: `${Math.round(c.share * 100)} % · ${formatKm(c.coveredM)} von ${formatKm(c.totalM)}`,
          progress: c.share,
          shareLine: `${lastDate} · ${formatKm(c.totalM)}`,
        }
      })
    const total = acts.reduce((s, a) => s + a.distance, 0)
    const milestones: Card[] = MILESTONES.map((m) => {
      const r = m.evaluate(acts)
      return {
        id: `ms-${m.id}`,
        motif: m.motif,
        title: m.title,
        detail: r.achievedAt ? dateFmt.format(r.achievedAt) : `${Math.round(r.progress * 100)} %`,
        // Meilensteine füllen sich bis zum Ziel; erreicht = voll
        progress: r.achievedAt ? 1 : r.progress * UNLOCK_AT * 0.99,
        shareLine: `${r.achievedAt ? dateFmt.format(r.achievedAt) : ''} · ${formatKm(total)} gesamt`,
        hint: m.description,
      }
    })
    return { trailCards: [...curated, ...other], milestoneCards: milestones, totalKm: total }
  }, [activities, trails])

  // Neu freigeschaltete Sticker einmal feiern
  const fresh = useMemo(
    () => (seenLoaded ? [...trailCards, ...milestoneCards].filter((c) => c.progress >= UNLOCK_AT && !seen.includes(c.id)).map((c) => c.id) : []),
    [trailCards, milestoneCards, seen, seenLoaded],
  )
  const [celebrating, setCelebrating] = useState<string[]>([])
  useEffect(() => {
    if (!fresh.length) return
    setCelebrating(fresh)
    setSeen([...seen, ...fresh])
  }, [fresh.join()])

  const unlocked = [...trailCards, ...milestoneCards].filter((c) => c.progress >= UNLOCK_AT).length

  return (
    <div className="h-full overflow-y-auto px-4 py-6">
      <div className="mx-auto max-w-2xl">
        <h1 className="text-2xl font-bold">Stickerheft</h1>
        <p className="mt-1 text-muted">
          Jeder Sticker füllt sich mit Farbe, je mehr du vom Weg mit aufgezeichneten oder importierten Touren begangen hast. Ab 90 %
          gehört er dir.
        </p>
        <p className="label mt-3 text-green-5">
          {unlocked} freigeschaltet · {formatKm(totalKm)} gewandert
        </p>
        {activities?.length === 0 && (
          <p className="mt-3 border-l-2 border-mark pl-3 text-sm">
            Noch keine erledigten Touren. Zeichne eine Tour auf oder importiere GPX-Dateien unter{' '}
            <Link to="/touren" className="underline">Touren › Erledigt</Link>.
          </p>
        )}

        <h2 className="label mt-6 text-muted">Fernwege</h2>
        <ul className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {trailCards.map((c) => (
            <StickerCard key={c.id} card={c} celebrate={celebrating.includes(c.id)} />
          ))}
        </ul>

        <h2 className="label mt-6 text-muted">Meilensteine</h2>
        <ul className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {milestoneCards.map((c) => (
            <StickerCard key={c.id} card={c} celebrate={celebrating.includes(c.id)} />
          ))}
        </ul>
      </div>
    </div>
  )
}
