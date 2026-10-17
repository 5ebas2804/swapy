import { Outlet, useNavigate } from 'react-router-dom'
import { LogOut, ShieldCheck, Zap } from 'lucide-react'
import { useCurrentUser, useSwapyStore } from '../store/useSwapyStore'
import Avatar from '../components/Avatar'

export default function AdminLayout() {
  const navigate = useNavigate()
  const user = useCurrentUser()
  const logout = useSwapyStore((s) => s.logout)

  return (
    <div className="min-h-full bg-ink-950">
      <header className="sticky top-0 z-30 border-b border-white/5 bg-ink-950/85 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3 md:px-8">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-swapy-400 text-ink-950"><Zap size={18} fill="currentColor" /></span>
          <span className="font-black">Swapy <span className="font-medium text-slate-500">Admin</span></span>
          <div className="ml-auto flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="flex items-center justify-end gap-1 text-sm font-semibold">{user.name} <ShieldCheck size={13} className="text-swapy-400" /></p>
              <p className="text-xs text-slate-500">{user.email}</p>
            </div>
            <Avatar user={user} size="sm" />
            <button
              onClick={() => { logout(); navigate('/login', { replace: true }) }}
              title="Cerrar sesión"
              className="rounded-lg border border-white/10 p-2 text-slate-400 hover:border-rose-400/40 hover:text-rose-300"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-8 md:px-8">
        <Outlet />
      </main>
    </div>
  )
}
