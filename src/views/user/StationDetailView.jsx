import { useMemo, useState } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, BatteryCharging, Clock, Footprints, HeartPulse, Loader2, Lock, MapPin, QrCode, Thermometer, Wallet, Zap } from 'lucide-react'
import { RESERVATION_MIN, useCurrentUser, useMyReservation, useSwapyStore } from '../../store/useSwapyStore'
import { PRICING } from '../../data/mockData'
import { LOCKER_STYLES, cop, socColor } from '../../components/user/ui'
import BatteryTechSheet from '../../components/user/BatteryTechSheet'

export default function StationDetailView() {
  const { stationId } = useParams()
  const navigate = useNavigate()
  const station = useSwapyStore((s) => s.stations.find((st) => st.id === stationId))
  const batteries = useSwapyStore((s) => s.batteries)
  const user = useCurrentUser()
  const reservation = useMyReservation()
  const reserveBattery = useSwapyStore((s) => s.reserveBattery)
  const [reserving, setReserving] = useState(false)
  const [error, setError] = useState(null)
  const [sheetId, setSheetId] = useState(null)
  const sheetBattery = batteries.find((b) => b.id === sheetId)

  const lockers = useMemo(() => {
    if (!station) return []
    return station.lockers.map((lockerId) => ({
      lockerId,
      battery: batteries.find((b) => b.stationId === station.id && b.lockerId === lockerId) ?? null,
    }))
  }, [station, batteries])

  if (!station) return <Navigate to="/app" replace />

  const ready = lockers.filter((l) => l.battery?.status === 'ready').map((l) => l.battery)
  const charging = lockers.filter((l) => l.battery?.status === 'charging').length
  const best = [...ready].sort((a, b) => b.soc - a.soc || b.soh - a.soh)[0]
  const offline = station.status !== 'online'

  const noFunds = user.balance < PRICING.SWAP_COP

  const handleReserve = () => {
    setError(null)
    setReserving(true)
    // pequeña espera para simular la comunicación con el ESP32 del casillero
    setTimeout(() => {
      const r = reserveBattery(station.id)
      setReserving(false)
      if (r.reservation) navigate('/app/reservation')
      else setError(r.error)
    }, 900)
  }

  return (
    <div className="px-5 pb-48 pt-8">
      <button onClick={() => navigate('/app')} className="mb-4 flex items-center gap-1.5 text-sm text-slate-400 hover:text-white">
        <ArrowLeft size={16} /> Estaciones
      </button>

      <header className="mb-5">
        <div className="mb-1 flex items-center gap-2">
          <span className={`h-2 w-2 rounded-full ${offline ? 'bg-slate-500' : 'animate-pulse bg-swapy-400'}`} />
          <span className="text-xs uppercase tracking-wider text-slate-400">
            {offline ? 'En mantenimiento' : 'En línea · IoT conectado'}
          </span>
        </div>
        <h1 className="text-2xl font-extrabold">{station.name}</h1>
        <p className="mt-1 flex items-center gap-1 text-sm text-slate-400"><MapPin size={13} /> {station.address}</p>
      </header>

      {/* métricas */}
      <div className="mb-6 grid grid-cols-3 gap-2">
        <Stat icon={<Zap size={16} />} value={ready.length} label="Listas" accent="text-swapy-400" />
        <Stat icon={<BatteryCharging size={16} />} value={charging} label="Cargando" accent="text-amber-400" />
        <Stat icon={<Footprints size={16} />} value={`${station.walkMin}′`} label={`${station.distanceKm} km`} accent="text-sky-400" />
      </div>

      {/* casilleros */}
      <div className="mb-3 flex items-end justify-between">
        <h2 className="font-bold">Casilleros</h2>
        <div className="flex gap-3 text-[10px] text-slate-400">
          {['ready', 'charging', 'locked'].map((k) => (
            <span key={k} className="flex items-center gap-1">
              <span className={`h-1.5 w-1.5 rounded-full ${LOCKER_STYLES[k].dot}`} /> {LOCKER_STYLES[k].label}
            </span>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {lockers.map(({ lockerId, battery }) => {
          const status = battery?.status ?? 'empty'
          const st = LOCKER_STYLES[status]
          const isBest = best && battery?.id === best.id
          return (
            <button
              key={lockerId}
              onClick={() => battery && setSheetId(battery.id)}
              disabled={!battery}
              className={`relative rounded-2xl border p-3 text-left transition enabled:hover:brightness-125 ${st.box} ${isBest ? 'ring-2 ring-swapy-400' : ''}`}
            >
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-300">{lockerId}</span>
                {status === 'locked' ? (
                  <Lock size={13} className="text-rose-400" />
                ) : (
                  <span className={`h-2 w-2 rounded-full ${st.dot} ${status === 'charging' ? 'animate-pulse' : ''}`} />
                )}
              </div>
              {battery ? (
                <>
                  <p className="text-lg font-extrabold leading-none">{Math.round(battery.soc)}%</p>
                  <div className="mt-2 h-1 overflow-hidden rounded-full bg-white/10">
                    <div className={`h-full ${status === 'locked' ? 'bg-rose-500' : socColor(battery.soc)}`} style={{ width: `${battery.soc}%` }} />
                  </div>
                  <p className={`mt-1.5 text-[10px] ${status === 'locked' ? 'text-rose-300' : 'text-slate-400'}`}>{st.label}</p>
                </>
              ) : (
                <p className="py-3 text-xs text-slate-500">Vacío</p>
              )}
              {isBest && (
                <span className="absolute -top-2 right-2 rounded-full bg-swapy-400 px-1.5 text-[9px] font-bold uppercase text-ink-950">Tuya</span>
              )}
            </button>
          )
        })}
      </div>
      <p className="mt-2 text-center text-[11px] text-slate-500">Toca un casillero para ver la ficha técnica de la batería</p>

      {/* batería asignada */}
      {best && !offline && (
        <section className="mt-6 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <p className="mb-2 text-xs uppercase tracking-wider text-slate-400">Te asignaremos</p>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-mono text-sm">{best.id}</p>
              <p className="text-xs text-slate-400">Casillero {best.lockerId}</p>
            </div>
            <div className="flex gap-4 text-sm">
              <span className="flex items-center gap-1 text-swapy-400"><Zap size={14} /> {Math.round(best.soc)}%</span>
              <span className="flex items-center gap-1 text-sky-300"><HeartPulse size={14} /> {best.soh}%</span>
              <span className="flex items-center gap-1 text-slate-300"><Thermometer size={14} /> {best.temp.toFixed(0)}°</span>
            </div>
          </div>
        </section>
      )}

      {/* CTA */}
      <div className="fixed inset-x-0 bottom-0 z-40 mx-auto max-w-md bg-gradient-to-t from-ink-900 via-ink-900 to-transparent p-4 pt-8 md:bottom-6 md:rounded-b-[2rem]">
        {!reservation && (noFunds || error === 'NO_FUNDS') && (
          <Link to="/app/wallet" className="mb-3 flex items-center gap-3 rounded-2xl border border-amber-400/30 bg-amber-400/10 p-3 text-sm">
            <Wallet size={18} className="text-amber-300" />
            <span className="flex-1">
              <span className="block font-semibold text-amber-200">Saldo insuficiente ({cop(user.balance)})</span>
              <span className="text-xs text-amber-200/70">El intercambio cuesta {cop(PRICING.SWAP_COP)}. Recarga tu billetera.</span>
            </span>
            <span className="text-xs font-bold text-amber-200">Recargar</span>
          </Link>
        )}
        {reservation ? (
          <Link to="/app/reservation" className="flex w-full items-center justify-center gap-2 rounded-2xl bg-sky-400 py-4 font-bold text-ink-950">
            <QrCode size={20} /> Ya tienes una reserva · Ver QR
          </Link>
        ) : (
          <button
            onClick={handleReserve}
            disabled={!best || offline || reserving || noFunds}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-swapy-400 py-4 text-base font-bold text-ink-950 shadow-xl shadow-swapy-400/20 transition active:scale-[0.98] disabled:bg-slate-700 disabled:text-slate-400 disabled:shadow-none"
          >
            {reserving ? (
              <><Loader2 size={20} className="animate-spin" /> Conectando con el casillero…</>
            ) : offline ? (
              'Estación en mantenimiento'
            ) : best ? (
              <><Zap size={20} fill="currentColor" /> Reservar batería · {cop(PRICING.SWAP_COP)}</>
            ) : (
              'Sin baterías disponibles'
            )}
          </button>
        )}
        <p className="mt-2 flex items-center justify-center gap-1 text-[11px] text-slate-500">
          <Clock size={11} /> La reserva se mantiene {RESERVATION_MIN} minutos · se cobra al hacer el cambio
        </p>
      </div>

      {sheetBattery && <BatteryTechSheet battery={sheetBattery} onClose={() => setSheetId(null)} />}
    </div>
  )
}

function Stat({ icon, value, label, accent }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
      <div className={`mb-1 ${accent}`}>{icon}</div>
      <p className="text-xl font-extrabold leading-none">{value}</p>
      <p className="mt-1 text-[11px] text-slate-400">{label}</p>
    </div>
  )
}
