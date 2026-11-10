import { NavLink, Outlet } from 'react-router-dom'

const NAV = [
  { to: '/', label: 'Karte', end: true },
  { to: '/fernwege', label: 'Fernwege', end: false },
  { to: '/touren', label: 'Touren', end: false },
  { to: '/konto', label: 'Konto', end: false },
]

export default function Layout() {
  return (
    <div className="flex h-full flex-col">
      <main className="relative min-h-0 flex-1">
        <Outlet />
      </main>
      <nav
        aria-label="Hauptnavigation"
        className="flex shrink-0 border-t border-text bg-surface pb-[env(safe-area-inset-bottom)]"
      >
        {NAV.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              `label flex min-h-14 flex-1 items-center justify-center border-t-3 text-[12px]! ${
                isActive ? 'border-text font-semibold! text-text' : 'border-transparent text-muted'
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
