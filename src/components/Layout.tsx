import { NavLink, Outlet } from 'react-router-dom'

const NAV = [
  { to: '/', label: 'Karte', end: true },
  { to: '/fernwege', label: 'Fernwege', end: false },
  { to: '/touren', label: 'Touren', end: false },
  { to: '/quellen', label: 'Quellen', end: false },
]

export default function Layout() {
  return (
    <div className="flex h-full flex-col">
      <main className="relative min-h-0 flex-1">
        <Outlet />
      </main>
      <nav
        aria-label="Hauptnavigation"
        className="flex shrink-0 border-t border-line bg-surface pb-[env(safe-area-inset-bottom)]"
      >
        {NAV.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              `flex min-h-14 flex-1 items-center justify-center text-base font-semibold ${
                isActive ? 'text-accent' : 'text-muted'
              }`
            }
          >
            {item.label}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
