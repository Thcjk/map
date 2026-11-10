import { useEffect, useState } from 'react'
import { useMap } from './MapContext'

const fmt = (v: number, pos: string, neg: string) => `${Math.abs(v).toFixed(4)}° ${v >= 0 ? pos : neg}`

/** Fadenkreuz in der Kartenmitte und deren Koordinaten, wie am Rand eines Kartenblatts. */
export default function CoordinateReadout() {
  const map = useMap()
  const [center, setCenter] = useState<{ lng: number; lat: number } | null>(null)

  useEffect(() => {
    if (!map) return
    const update = () => setCenter(map.getCenter())
    update()
    map.on('move', update)
    return () => {
      map.off('move', update)
    }
  }, [map])

  if (!center) return null
  return (
    <>
      <svg aria-hidden width="22" height="22" viewBox="0 0 22 22" className="pointer-events-none absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2 text-mark">
        <path d="M11 0v8M11 14v8M0 11h8M14 11h8" stroke="currentColor" strokeWidth="1.2" />
      </svg>
      <p className="label pointer-events-none absolute left-2.5 top-[68px] z-10 bg-surface/80 px-1.5 py-0.5 text-[10px]! text-text">
        {fmt(center.lat, 'N', 'S')}
        <br />
        {fmt(center.lng, 'E', 'W')}
      </p>
    </>
  )
}
