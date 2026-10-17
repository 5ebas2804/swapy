import { useNavigate } from 'react-router-dom'
import { Bike, IdCard, LogOut, Mail, Phone, Repeat, ShieldCheck } from 'lucide-react'
import { useCurrentUser, useSwapyStore } from '../../store/useSwapyStore'
import Avatar from '../../components/Avatar'

export default function ProfileView() {
  const navigate = useNavigate()
  const user = useCurrentUser()
  const logout = useSwapyStore((s) => s.logout)

  const rows = [
    { icon: Mail, label: 'Cuenta de Google', value: user.email },
    { icon: Phone, label: 'Celular', value: user.phone ?? '—' },
    { icon: IdCard, label: 'Documento', value: user.documentId ?? '—' },
    { icon: Bike, label: 'Vehículo', value: user.vehicle ?? '—' },
    { icon: Repeat, label: 'Intercambios este mes', value: user.swapsThisMonth },
  ]

  return (
    <div className="px-5 pb-28 pt-8">
      <div className="mb-6 flex flex-col items-center text-center">
        <Avatar user={user} size="lg" className="mb-3" />
        <h1 className="text-xl font-extrabold">{user.name}</h1>
        {user.verified && (
          <span className="mt-2 flex items-center gap-1 rounded-full bg-swapy-400/15 px-2.5 py-1 text-xs font-semibold text-swapy-400">
            <ShieldCheck size={13} /> Cuenta verificada
          </span>
        )}
      </div>

      <ul className="mb-6 divide-y divide-white/5 rounded-2xl border border-white/10 bg-white/[0.03]">
        {rows.map(({ icon: Icon, label, value }) => (
          <li key={label} className="flex items-center gap-3 p-4">
            <Icon size={18} className="text-slate-400" />
            <span className="flex-1 text-sm text-slate-400">{label}</span>
            <span className="max-w-[55%] truncate text-right text-sm font-medium">{value}</span>
          </li>
        ))}
      </ul>

      <button
        onClick={() => { logout(); navigate('/login', { replace: true }) }}
        className="flex w-full items-center justify-center gap-2 rounded-2xl border border-rose-500/30 py-3.5 font-semibold text-rose-300 transition hover:bg-rose-500/10"
      >
        <LogOut size={18} /> Cerrar sesión
      </button>
    </div>
  )
}
