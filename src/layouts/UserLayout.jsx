import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { BatteryMedium, MapPin, User, Wallet } from 'lucide-react'

const TABS = [
  { to: '/app', label: 'Estaciones', icon: MapPin, end: true },
  { to: '/app/battery', label: 'Mi batería', icon: BatteryMedium },
  { to: '/app/wallet', label: 'Billetera', icon: Wallet },
  { to: '/app/profile', label: 'Perfil', icon: User },
]

// Contenedor mobile-first: en escritorio se centra como "teléfono" para la demo.
export default function UserLayout() {
  const { pathname } = useLocation()
  const showNav = TABS.some((t) => t.to === pathname)

  return (
    <div className="flex min-h-full justify-center bg-ink-950">
      <main className="relative min-h-full w-full max-w-md bg-ink-900 pb-[env(safe-area-inset-bottom)] md:my-6 md:min-h-[calc(100vh-3rem)] md:rounded-[2rem] md:border md:border-white/10 md:shadow-2xl">
        <Outlet />
        {showNav && (
          <nav className="fixed inset-x-0 bottom-0 z-30 mx-auto max-w-md border-t border-white/10 bg-ink-900/90 px-2 pb-[max(env(safe-area-inset-bottom),0.5rem)] pt-2 backdrop-blur md:bottom-6 md:rounded-b-[2rem]">
            <ul className="grid grid-cols-4">
              {TABS.map(({ to, label, icon: Icon, end }) => (
                <li key={to}>
                  <NavLink
                    to={to}
                    end={end}
                    className={({ isActive }) =>
                      `flex flex-col items-center gap-1 rounded-xl py-1.5 text-[11px] font-medium transition ${isActive ? 'text-swapy-400' : 'text-slate-500 hover:text-slate-300'}`
                    }
                  >
                    <Icon size={22} />
                    {label}
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>
        )}
      </main>
    </div>
  )
}
