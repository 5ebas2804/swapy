import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AlertTriangle, BatteryLow, ChevronRight, Footprints, MapPin, QrCode, ShieldAlert, Wallet, Wrench, X, Zap } from 'lucide-react'
import { useCurrentUser, useMyCancelled, useMyReservation, useSwapyStore } from '../../store/useSwapyStore'
import StationMap from '../../components/user/StationMap'
import Avatar from '../../components/Avatar'
import { cop, socColor, socText } from '../../components/user/ui'

export default function StationsView() {
  const navigate = useNavigate()
  const rider = useCurrentUser()
  const stations = useSwapyStore((s) => s.stations)
  const batteries = useSwapyStore((s) => s.batteries)
  const reservation = useMyReservation()
  const cancelled = useMyCancelled()
  const dismissCancelled = useSwapyStore((s) => s.dismissCancelled)
  const [selectedId, setSelectedId] = useState(null)

  const availability = useMemo(() => {
    const acc = {}
    for (const b of batteries) if (b.status === 'ready') acc[b.stationId] = (acc[b.stationId] ?? 0) + 1
    return acc
  }, [batteries])

  const sorted = useMemo(() => [...stations].sort((a, b) => a.distanceKm - b.distanceKm), [stations])
  const soc = rider.currentBattery.soc
  const firstName = rider.name.split(' ')[0]

  return (
    <div className="px-5 pb-44 pt-8">
      {/* saludo */}
      <header className="mb-5 flex items-center gap-3">
        <Link to="/app/profile"><Avatar user={rider} /></Link>
        <div className="flex-1">
          <p className="text-xs text-slate-400">Hola, {firstName} 👋</p>
          <h1 className="text-lg font-bold leading-tight">¿Cambiamos batería?</h1>
        </div>
        <Link to="/app/wallet" className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-sm font-semibold">
          <Wallet size={15} className="text-swapy-400" /> {cop(rider.balance)}
        </Link>
      </header>

      {/* batería actual */}
      <Link to="/app/battery" className="mb-5 block rounded-3xl border border-white/10 bg-gradient-to-br from-ink-800 to-ink-900 p-4 transition hover:border-white/20">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-wider text-slate-400">Tu batería</p>
            <p className={`text-3xl font-extrabold ${socText(soc)}`}>{soc}%</p>
          </div>
          <div className="text-right text-xs text-slate-400">
            <p className="font-mono">{rider.currentBattery.id}</p>
            <p>{rider.vehicle}</p>
          </div>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
          <div className={`h-full rounded-full ${socColor(soc)} transition-all`} style={{ width: `${soc}%` }} />
        </div>
        {soc < 20 && (
          <p className="mt-3 flex items-center gap-2 text-xs text-rose-300">
            <BatteryLow size={14} /> Batería baja · autonomía aprox. {Math.round(soc * 0.6)} km
          </p>
        )}
        <p className="mt-2 flex items-center justify-end gap-1 text-[11px] text-slate-500">Ver estadísticas técnicas <ChevronRight size={12} /></p>
      </Link>

      {/* reserva cancelada por seguridad */}
      {cancelled && (
        <div className="mb-4 flex gap-3 rounded-2xl border border-rose-500/40 bg-rose-500/10 p-3 text-sm">
          <ShieldAlert className="mt-0.5 shrink-0 text-rose-400" size={18} />
          <div className="flex-1">
            <p className="font-semibold text-rose-200">Reserva {cancelled.token} cancelada</p>
            <p className="text-xs text-rose-200/70">{cancelled.reason}. No se te cobró nada; reserva otra.</p>
          </div>
          <button onClick={dismissCancelled} className="self-start text-rose-300" aria-label="Cerrar"><X size={16} /></button>
        </div>
      )}

      {/* mapa */}
      <StationMap
        stations={stations}
        availability={availability}
        rider={rider}
        selectedId={selectedId}
        onSelect={(id) => setSelectedId(id)}
      />

      {/* lista */}
      <div className="mb-3 mt-6 flex items-end justify-between">
        <h2 className="text-base font-bold">Estaciones cercanas</h2>
        <span className="text-xs text-slate-400">{sorted.length} estaciones</span>
      </div>

      <ul className="space-y-3">
        {sorted.map((s) => {
          const count = availability[s.id] ?? 0
          const offline = s.status !== 'online'
          const selected = s.id === selectedId
          return (
            <li key={s.id}>
              <button
                onClick={() => navigate(`/app/station/${s.id}`)}
                onMouseEnter={() => setSelectedId(s.id)}
                className={`flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition active:scale-[0.98] ${
                  selected ? 'border-swapy-400/50 bg-white/[0.06]' : 'border-white/10 bg-white/[0.03] hover:bg-white/[0.06]'
                }`}
              >
                <div
                  className={`grid h-12 w-12 shrink-0 place-items-center rounded-xl ${
                    offline ? 'bg-slate-700 text-slate-300' : count ? 'bg-swapy-400/15 text-swapy-400' : 'bg-amber-400/10 text-amber-400'
                  }`}
                >
                  {offline ? <Wrench size={20} /> : <Zap size={22} fill="currentColor" />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{s.name}</p>
                  <p className="flex items-center gap-1 truncate text-xs text-slate-400"><MapPin size={11} /> {s.address}</p>
                  <p className="mt-1 flex items-center gap-1 text-xs text-slate-500">
                    <Footprints size={11} /> {s.distanceKm} km · {s.walkMin} min
                  </p>
                </div>
                <div className="text-right">
                  {offline ? (
                    <span className="rounded-full bg-slate-700 px-2 py-0.5 text-[10px] font-semibold uppercase text-slate-300">Mantenimiento</span>
                  ) : (
                    <>
                      <p className={`text-2xl font-extrabold leading-none ${count ? 'text-swapy-400' : 'text-amber-400'}`}>{count}</p>
                      <p className="text-[10px] uppercase tracking-wide text-slate-400">{count === 1 ? 'lista' : 'listas'}</p>
                    </>
                  )}
                </div>
                <ChevronRight size={18} className="text-slate-500" />
              </button>
            </li>
          )
        })}
      </ul>

      {/* reserva activa */}
      {reservation && (
        <div className="fixed inset-x-0 bottom-[4.5rem] z-40 mx-auto max-w-md px-4 pb-2 md:bottom-[6rem]">
          <Link
            to="/app/reservation"
            className="flex items-center gap-3 rounded-2xl bg-swapy-400 p-4 font-semibold text-ink-950 shadow-2xl shadow-swapy-400/20"
          >
            <QrCode size={22} />
            <span className="flex-1">Reserva activa · Casillero {reservation.lockerId}</span>
            <span className="text-sm">Ver QR</span>
            <ChevronRight size={18} />
          </Link>
        </div>
      )}

      {!reservation && soc < 20 && (
        <p className="mt-6 flex items-center justify-center gap-1.5 text-center text-xs text-slate-500">
          <AlertTriangle size={12} /> Te recomendamos {sorted.find((s) => s.status === 'online' && availability[s.id])?.name}
        </p>
      )}
    </div>
  )
}
