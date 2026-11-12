import { useEffect, useRef, type ReactNode } from 'react'
import { CloseIcon } from './icons'

interface Props {
  title: string
  onClose: () => void
  children: ReactNode
}

/** Modaler Dialog: auf dem Handy von unten, am Desktop mittig. Escape und Tippen daneben schliessen. */
export default function Dialog({ title, onClose, children }: Props) {
  const panel = useRef<HTMLElement>(null)
  const latestClose = useRef(onClose)
  latestClose.current = onClose

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null
    panel.current?.focus()
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && latestClose.current()
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
      previous?.focus?.()
    }
  }, [])

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-text/45 sm:items-center sm:justify-center" onClick={onClose}>
      <section
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        className="panel max-h-[88%] w-full overflow-y-auto rounded-b-none border-x-0 border-b-0 p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] outline-none sm:w-[420px] sm:rounded-b-[4px] sm:border"
      >
        <header className="mb-3 flex items-center justify-between gap-2">
          <h2 className="label text-[12px]!">{title}</h2>
          <button type="button" onClick={onClose} aria-label="Schliessen" className="-m-2 flex size-11 items-center justify-center text-muted">
            <CloseIcon />
          </button>
        </header>
        {children}
      </section>
    </div>
  )
}
