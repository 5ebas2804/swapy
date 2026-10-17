import { Link } from 'react-router-dom'
import { BatteryLow, ChevronRight, Repeat } from 'lucide-react'
import { useCurrentUser } from '../../store/useSwapyStore'
import BatteryTechStats from '../../components/user/BatteryTechStats'

export default function MyBatteryView() {
  const user = useCurrentUser()
  const b = user.currentBattery

  return (
    <div className="px-5 pb-28 pt-8">
      <h1 className="text-2xl font-extrabold">Mi batería</h1>
      <p className="mb-5 text-sm text-slate-400">{user.vehicle} · última lectura del BMS</p>

      {b.soc < 20 && (
        <Link to="/app" className="mb-5 flex items-center gap-3 rounded-2xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm">
          <BatteryLow className="text-rose-400" size={20} />
          <span className="flex-1 text-rose-100">Carga baja. Busca una estación para cambiarla.</span>
          <ChevronRight size={16} className="text-rose-300" />
        </Link>
      )}

      <BatteryTechStats battery={b} />

      <p className="mt-5 flex items-center justify-center gap-1.5 text-xs text-slate-500">
        <Repeat size={12} /> {user.swapsThisMonth} intercambios este mes
      </p>
    </div>
  )
}
