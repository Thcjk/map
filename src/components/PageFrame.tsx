import type { ReactNode } from 'react'
import { APP_NAME } from '../config'

interface Props {
  /** Nummer des «Kartenblatts», rein gestalterisch. */
  sheet: string
  title: string
  meta?: string
  intro?: ReactNode
  children: ReactNode
}

/** Seitenrahmen im Stil eines Kartenblatts: Kopfzeile, Titel als Wortmarke, Passkreuze. */
export default function PageFrame({ sheet, title, meta, intro, children }: Props) {
  return (
    <div className="relative mx-auto min-h-full max-w-2xl px-4 pt-4 pb-10">
      <span className="regmark left-1 top-1" aria-hidden />
      <span className="regmark right-1 top-1" aria-hidden />
      <header className="border-b border-text pb-4">
        <p className="label flex justify-between gap-3 text-[10px]! text-muted">
          <span>
            {APP_NAME} · Blatt {sheet}
          </span>
          {meta && <span className="text-right">{meta}</span>}
        </p>
        <h1 className="mt-4 text-[clamp(1.9rem,9vw,2.75rem)]">{title}</h1>
        {intro && <p className="mt-2 max-w-prose text-muted">{intro}</p>}
      </header>
      <div className="pt-4">{children}</div>
    </div>
  )
}
