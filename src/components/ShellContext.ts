import { createContext, useContext } from 'react'

export interface Shell {
  /** Die Karte ist die sichtbare Seite (keine andere Seite liegt darüber). */
  onMap: boolean
  /** Fokus-Modus (Planen, Aufzeichnen): untere Navigation ausblenden. */
  setFocus: (focus: boolean) => void
}

export const ShellContext = createContext<Shell>({ onMap: true, setFocus: () => undefined })
export const useShell = () => useContext(ShellContext)
