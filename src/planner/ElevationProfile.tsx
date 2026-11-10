import { useEffect, useMemo, useRef, useState } from 'react'
import { indexAtDistance } from '../lib/geo'
import { formatDuration } from '../lib/hikingTime'
import { formatKm } from '../lib/format'
import type { Route } from '../routing/route'
import { SURFACE_COLORS } from '../routing/wayInfo'

interface Props {
  route: Route
  highlightIndex: number | null
  onHighlight: (index: number | null) => void
}

const HEIGHT = 120
const PAD = { top: 8, right: 8, bottom: 18, left: 40 }

/** Interaktives Höhenprofil. Tippen oder Ziehen markiert den Punkt auf der Karte. */
export default function ElevationProfile({ route, highlightIndex, onHighlight }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(320)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const ro = new ResizeObserver(([e]) => setWidth(Math.max(200, e.contentRect.width)))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const chart = useMemo(() => {
    const total = route.distance || 1
    const innerW = width - PAD.left - PAD.right
    const innerH = HEIGHT - PAD.top - PAD.bottom
    let min = Infinity
    let max = -Infinity
    for (const p of route.points) {
      if (p[2] === null) continue
      if (p[2] < min) min = p[2]
      if (p[2] > max) max = p[2]
    }
    const span = Math.max(50, max - min)
    const lo = Math.floor((min - span * 0.08) / 10) * 10
    const hi = Math.ceil((max + span * 0.08) / 10) * 10
    const x = (d: number) => PAD.left + (d / total) * innerW
    const y = (e: number) => PAD.top + innerH - ((e - lo) / (hi - lo)) * innerH
    // Höchstens ein Punkt pro Pixel zeichnen, damit lange Routen flüssig bleiben.
    const step = Math.max(1, Math.floor(route.points.length / innerW))
    let line = ''
    let last = lo
    for (let i = 0; i < route.points.length; i += step) {
      const e = route.points[i][2] ?? last
      last = e
      line += `${line ? 'L' : 'M'}${x(route.cum[i]).toFixed(1)},${y(e).toFixed(1)}`
    }
    const area = `${line}L${x(total)},${y(lo)}L${x(0)},${y(lo)}Z`
    return { x, y, lo, hi, area, line, innerW, total }
  }, [route, width])

  const pick = (clientX: number) => {
    const rect = ref.current!.getBoundingClientRect()
    const d = ((clientX - rect.left - PAD.left) / chart.innerW) * chart.total
    onHighlight(indexAtDistance(route.cum, Math.min(Math.max(d, 0), chart.total)))
  }

  const hp = highlightIndex !== null ? route.points[highlightIndex] : null

  return (
    <div ref={ref} className="relative select-none">
      <svg
        width={width}
        height={HEIGHT}
        role="img"
        aria-label={`Höhenprofil von ${Math.round(chart.lo)} bis ${Math.round(chart.hi)} Meter`}
        className="touch-none"
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId)
          pick(e.clientX)
        }}
        onPointerMove={(e) => (e.buttons || e.pointerType === 'mouse') && pick(e.clientX)}
        onPointerLeave={(e) => e.pointerType === 'mouse' && onHighlight(null)}
      >
        <defs>
          <linearGradient id="profile-fill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="#ff7a1a" stopOpacity="0.45" />
            <stop offset="1" stopColor="#ff7a1a" stopOpacity="0.05" />
          </linearGradient>
        </defs>
        {[chart.lo, (chart.lo + chart.hi) / 2, chart.hi].map((v) => (
          <g key={v}>
            <line x1={PAD.left} x2={width - PAD.right} y1={chart.y(v)} y2={chart.y(v)} stroke="#33414a" />
            <text x={PAD.left - 6} y={chart.y(v) + 4} textAnchor="end" fontSize="11" fill="#a7b4bd">
              {Math.round(v)}
            </text>
          </g>
        ))}
        <path d={chart.area} fill="url(#profile-fill)" />
        <path d={chart.line} fill="none" stroke="#ff7a1a" strokeWidth="2" />
        {/* Wegbeschaffenheit als Farbband unter dem Profil */}
        {route.ways.map((w, i) => (
          <rect
            key={i}
            x={chart.x(route.cum[w.from])}
            width={Math.max(0.5, chart.x(route.cum[w.to]) - chart.x(route.cum[w.from]))}
            y={HEIGHT - PAD.bottom + 4}
            height={6}
            fill={SURFACE_COLORS[w.surface]}
          />
        ))}
        {hp && highlightIndex !== null && (
          <line
            x1={chart.x(route.cum[highlightIndex])}
            x2={chart.x(route.cum[highlightIndex])}
            y1={PAD.top}
            y2={HEIGHT - PAD.bottom}
            stroke="#fff"
            strokeWidth="1.5"
          />
        )}
      </svg>
      {hp && highlightIndex !== null && (
        <div className="tabular pointer-events-none absolute right-2 top-1 rounded-md bg-bg/85 px-2 py-0.5 text-xs">
          {formatKm(route.cum[highlightIndex])} · {hp[2] !== null ? `${Math.round(hp[2])} m` : '–'} ·{' '}
          {formatDuration(route.minutes[highlightIndex])}
        </div>
      )}
    </div>
  )
}
