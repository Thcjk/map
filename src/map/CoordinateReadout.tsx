import { useEffect, useRef } from 'react'
import { useMap } from './MapContext'

const fmt = (v: number, pos: string, neg: string) => `${Math.abs(v).toFixed(4)}° ${v >= 0 ? pos : neg}`

/**
 * Fadenkreuz in der Kartenmitte und deren Koordinaten, wie am Rand eines Kartenblatts.
 * Der Text wird direkt gesetzt (ohne React-Durchlauf), damit das Verschieben flüssig bleibt.
 */
export default function CoordinateReadout() {
  const map = useMap()
  const text = useRef<HTMLParagraphElement>(null)
  const cross = useRef<SVGSVGElement>(null)

  useEffect(() => {
    if (!map) return
    let frame = 0
    const update = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        const c = map.getCenter()
        if (text.current) text.current.textContent = `${fmt(c.lat, 'N', 'S')}  ${fmt(c.lng, 'E', 'W')}`
        // Die Kartenmitte verschiebt sich, wenn Bedienflächen einen Rand belegen.
        const p = map.getPadding()
        if (cross.current)
          cross.current.style.transform = `translate(calc(-50% + ${((p.left ?? 0) - (p.right ?? 0)) / 2}px), calc(-50% + ${((p.top ?? 0) - (p.bottom ?? 0)) / 2}px))`
      })
    }
    update()
    map.on('move', update)
    return () => {
      cancelAnimationFrame(frame)
      map.off('move', update)
    }
  }, [map])

  return (
    <>
      <svg ref={cross} aria-hidden width="26" height="26" viewBox="0 0 26 26" className="pointer-events-none absolute left-1/2 top-1/2 z-10 text-mark">
        <path d="M13 0v9M13 17v9M0 13h9M17 13h9" stroke="currentColor" strokeWidth="1.1" />
      </svg>
      <p ref={text} aria-hidden className="label pointer-events-none absolute left-2.5 top-[66px] z-10 whitespace-pre bg-surface/85 px-1.5 py-0.5 text-[10px]! text-text" />
    </>
  )
}
