import { lazy, Suspense, useMemo, useState, type ComponentType, type SVGProps } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { useOnline } from '../lib/useOnline'
import { ListIcon, MapIcon, MoreIcon, SignpostIcon } from './icons'
import { ShellContext } from './ShellContext'

// Die Karte (MapLibre) ist der grösste Brocken: gleich beim Start laden, aber getrennt vom Gerüst.
const MapScreen = lazy(() => import('../map/MapScreen'))

const NAV: { to: string; label: string; icon: ComponentType<SVGProps<SVGSVGElement>>; end?: boolean }[] = [
  { to: '/', label: 'Karte', icon: MapIcon, end: true },
  { to: '/fernwege', label: 'Fernwege', icon: SignpostIcon },
  { to: '/touren', label: 'Touren', icon: ListIcon },
  { to: '/mehr', label: 'Mehr', icon: MoreIcon },
]

const Loading = () => (
  <p role="status" className="label p-6 text-muted">
    Lädt …
  </p>
)

/**
 * Gerüst der App. Die Karte bleibt immer geladen; andere Seiten legen sich darüber.
 * So ist der Wechsel zurück zur Karte sofort da, samt Route und Ansicht.
 */
export default function Layout() {
  const online = useOnline()
  const onMap = useLocation().pathname === '/'
  const [focus, setFocus] = useState(false)
  const shell = useMemo(() => ({ onMap, setFocus }), [onMap])

  return (
    <ShellContext.Provider value={shell}>
      <div className="flex h-full flex-col">
        <main className="relative min-h-0 flex-1">
          <div className="absolute inset-0" inert={!onMap}>
            <Suspense fallback={<Loading />}>
              <MapScreen />
            </Suspense>
          </div>
          {!onMap && (
            <div className="absolute inset-0 z-40 overflow-y-auto paper">
              <Suspense fallback={<Loading />}>
                <Outlet />
              </Suspense>
            </div>
          )}
        </main>
        {!online && (
          <p role="status" className="label shrink-0 bg-text px-3 py-1.5 text-center text-surface">
            Offline · gespeicherte Touren und Karten bleiben nutzbar
          </p>
        )}
        {!(focus && onMap) && (
          <nav aria-label="Hauptnavigation" className="flex shrink-0 border-t border-text bg-surface pb-[env(safe-area-inset-bottom)]">
            {NAV.map(({ to, label, icon: Icon, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) =>
                  `label flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 text-[10px]! ${
                    isActive ? 'bg-text font-semibold! text-surface' : 'text-muted'
                  }`
                }
              >
                <Icon width={20} height={20} />
                {label}
              </NavLink>
            ))}
          </nav>
        )}
      </div>
    </ShellContext.Provider>
  )
}
