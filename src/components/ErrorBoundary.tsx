import { Component, type ReactNode } from 'react'

/** Fängt unerwartete Fehler ab, damit nie eine leere Seite bleibt. Daten bleiben lokal erhalten. */
export default class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null }

  static getDerivedStateFromError(error: Error) {
    return { error }
  }

  render() {
    if (!this.state.error) return this.props.children
    return (
      <div role="alert" className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
        <h1 className="text-2xl font-bold">Da ist etwas schiefgelaufen</h1>
        <p className="max-w-sm text-muted">Deine Touren und Aufzeichnungen sind lokal gespeichert und gehen nicht verloren.</p>
        <p className="label max-w-sm text-muted">{this.state.error.message}</p>
        <button type="button" onClick={() => location.reload()} className="min-h-12 rounded-xl bg-accent px-6 font-bold text-bg">
          Neu laden
        </button>
      </div>
    )
  }
}
