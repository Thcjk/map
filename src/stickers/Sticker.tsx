import { useId } from 'react'
import { MOTIFS, type MotifId } from './motifs'

interface Props {
  motif: MotifId
  /** 0…1: Anteil, der mit Farbe gefüllt ist. Ab 0.9 gilt der Sticker als freigeschaltet. */
  progress: number
  size?: number
  /** Kleine Animation beim Freischalten. */
  celebrate?: boolean
  title?: string
}

export const UNLOCK_AT = 0.9
const INK = '#3d413c'
const INK_LOCKED = '#a3a69c'

/**
 * Sticker als SVG: Fineline-Strich mit leichter Unregelmässigkeit, Aquarellflächen mit
 * Textur, weisser Die-Cut-Rand mit Schatten. Gesperrt nur als graue Kontur; die Farbe
 * steigt mit dem Fortschritt von unten nach oben.
 */
export default function Sticker({ motif, progress, size = 160, celebrate = false, title }: Props) {
  const id = useId().replace(/:/g, '')
  const m = MOTIFS[motif]
  const unlocked = progress >= UNLOCK_AT
  const level = unlocked ? 1 : Math.max(0, Math.min(1, progress))
  // Füllhöhe im Motivbereich (y 20…180), mit weicher Kante
  const y = 180 - level * 160
  const seed = [...motif].reduce((s, c) => s + c.charCodeAt(0), 0) % 97

  return (
    <svg
      viewBox="-20 -20 240 240"
      width={size}
      height={size}
      role="img"
      aria-label={title ? `${title}: ${unlocked ? 'freigeschaltet' : `${Math.round(progress * 100)} %`}` : undefined}
      className={celebrate ? 'sticker-pop' : undefined}
    >
      <defs>
        <filter id={`${id}-ink`} x="-5%" y="-5%" width="110%" height="110%">
          <feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="2" seed={seed} result="n" />
          <feDisplacementMap in="SourceGraphic" in2="n" scale="2.4" />
        </filter>
        <filter id={`${id}-wash`} x="-10%" y="-10%" width="120%" height="120%">
          <feTurbulence type="fractalNoise" baseFrequency="0.022" numOctaves="3" seed={seed + 7} result="n" />
          <feDisplacementMap in="SourceGraphic" in2="n" scale="7" result="d" />
          <feGaussianBlur in="d" stdDeviation="0.9" result="b" />
          {/* ungleichmässige Deckkraft wie bei verlaufender Farbe */}
          <feColorMatrix in="n" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  1.1 0 0 0 0.42" result="pool" />
          <feComposite in="b" in2="pool" operator="in" />
        </filter>
        <filter id={`${id}-cut`} x="-20%" y="-20%" width="140%" height="140%">
          <feMorphology in="SourceAlpha" operator="dilate" radius="9" result="fat" />
          <feGaussianBlur in="fat" stdDeviation="2" result="soft" />
          <feComponentTransfer in="soft" result="edge">
            <feFuncA type="linear" slope="12" intercept="-5" />
          </feComponentTransfer>
          <feFlood floodColor={unlocked || level > 0 ? '#ffffff' : '#f1f0e6'} />
          <feComposite in2="edge" operator="in" result="white" />
          <feGaussianBlur in="edge" stdDeviation="3.5" result="blur" />
          <feOffset in="blur" dy="3" result="off" />
          <feFlood floodColor="#17241a" floodOpacity="0.32" />
          <feComposite in2="off" operator="in" result="shadow" />
          <feMerge>
            <feMergeNode in="shadow" />
            <feMergeNode in="white" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <linearGradient id={`${id}-rise`} x1="0" x2="0" y1="0" y2="1" gradientUnits="userSpaceOnUse" gradientTransform={`translate(0 ${y - 8}) scale(1 16)`}>
          <stop offset="0" stopColor="#000" />
          <stop offset="1" stopColor="#fff" />
        </linearGradient>
        <mask id={`${id}-mask`} maskUnits="userSpaceOnUse" x="-20" y="-20" width="240" height="240">
          {level >= 1 ? <rect x="-20" y="-20" width="240" height="240" fill="#fff" /> : level > 0 ? <rect x="-20" y={y - 8} width="240" height={240} fill={`url(#${id}-rise)`} /> : null}
        </mask>
      </defs>
      <g filter={`url(#${id}-cut)`}>
        {m.silhouette.map((d, i) => (
          <path key={i} d={d} fill={level > 0 ? '#fff' : '#f1f0e6'} />
        ))}
        <g mask={`url(#${id}-mask)`}>
          <g filter={`url(#${id}-wash)`}>
            {m.fills.map((f, i) => (
              <path key={i} d={f.d} fill={f.color} opacity={f.opacity ?? 0.9} />
            ))}
          </g>
        </g>
        <g filter={`url(#${id}-ink)`} fill="none" stroke={level > 0 ? INK : INK_LOCKED} strokeWidth="1.15" strokeLinecap="round" strokeLinejoin="round">
          {m.lines.map((d, i) => (
            <path key={i} d={d} />
          ))}
        </g>
        {'text' in m && m.text && (
          <text x={m.text.x} y={m.text.y} textAnchor="middle" fontSize={m.text.size} fontFamily="'IBM Plex Mono', ui-monospace, monospace" fontWeight="600" fill={level > 0 ? INK : INK_LOCKED}>
            {m.text.value}
          </text>
        )}
      </g>
    </svg>
  )
}
