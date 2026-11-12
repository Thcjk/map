import { useRef, type ReactNode } from 'react'

interface Props {
  label: string
  /** Immer sichtbarer Kopf (Titel, Kennzahlen, Hauptaktionen). */
  header: ReactNode
  /** Inhalt, der beim Aufziehen erscheint. */
  children?: ReactNode
  open: boolean
  onOpenChange: (open: boolean) => void
}

/**
 * Panel am unteren Kartenrand. Am Griff antippen oder ziehen öffnet/schliesst den Inhalt.
 * Am Desktop sitzt es als Spalte links.
 */
export default function Sheet({ label, header, children, open, onOpenChange }: Props) {
  const startY = useRef<number | null>(null)

  return (
    <section
      aria-label={label}
      className="panel absolute inset-x-0 bottom-0 z-20 rounded-b-none border-x-0 border-b-0 sm:inset-x-auto sm:bottom-2.5 sm:left-2.5 sm:w-[400px] sm:rounded-b-[4px] sm:border"
    >
      {children && (
        <button
          type="button"
          aria-expanded={open}
          aria-label={open ? 'Details einklappen' : 'Details anzeigen'}
          className="flex h-7 w-full shrink-0 touch-none items-center justify-center"
          onPointerDown={(e) => (startY.current = e.clientY)}
          onPointerUp={(e) => {
            const dy = startY.current === null ? 0 : e.clientY - startY.current
            startY.current = null
            if (dy < -16) onOpenChange(true)
            else if (dy > 16) onOpenChange(false)
            else onOpenChange(!open)
          }}
          onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onOpenChange(!open)}
        >
          <span className="h-1 w-10 rounded-full bg-line" />
        </button>
      )}
      <div className={`shrink-0 px-3 ${children ? '' : 'pt-3'} pb-3`}>{header}</div>
      {children && (
        <div className={`grid transition-[grid-template-rows] duration-200 ${open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
          <div className="min-h-0 overflow-hidden">
            <div className="max-h-[52dvh] overflow-y-auto border-t border-line px-3 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] sm:max-h-[calc(100dvh-24rem)]" inert={!open}>
              {children}
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
