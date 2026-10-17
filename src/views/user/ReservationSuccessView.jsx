import { useEffect, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { QRCodeSVG } from 'qrcode.react'
import { ArrowLeft, BatteryFull, CheckCircle2, Clock, Copy, LockOpen, MapPin, Receipt, ScanLine, ShieldAlert, Timer, Wallet, Zap } from 'lucide-react'
import { useCurrentUser, useMyCancelled, useMyReservation, useSwapyStore } from '../../store/useSwapyStore'
import { PRICING } from '../../data/mockData'
import { cop, formatDuration } from '../../components/user/ui'

export default function ReservationSuccessView() {
  const navigate = useNavigate()
  const user = useCurrentUser()
  const reservation = useMyReservation()
  const cancelled = useMyCancelled()
  const lastSwap = useSwapyStore((s) => s.lastSwap)
  const stations = useSwapyStore((s) => s.stations)
  const completeSwap = useSwapyStore((s) => s.completeSwap)
  const cancelReservation = useSwapyStore((s) => s.cancelReservation)
  const dismissCancelled = useSwapyStore((s) => s.dismissCancelled)

  const [phase, setPhase] = useState('reserved') // reserved | unlocking | done
  const [now, setNow] = useState(Date.now())

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [])

  // el vencimiento lo resuelve la telemetría del store; aquí solo se muestra la cuenta regresiva
  const remaining = reservation ? Math.max(0, reservation.expiresAt - now) : 0

  // ---- intercambio completado ----
  if (phase === 'done' && lastSwap) {
    const st = stations.find((s) => s.id === lastSwap.stationId)
    return (
      <div className="flex min-h-full flex-col px-5 pb-10 pt-8">
        <div className="flex flex-1 flex-col items-center justify-center text-center">
          <div className="relative mb-6">
            <span className="absolute inset-0 animate-ping rounded-full bg-swapy-400/30" />
            <div className="relative grid h-24 w-24 place-items-center rounded-full bg-swapy-400 text-ink-950">
              <CheckCircle2 size={48} />
            </div>
          </div>
          <h1 className="text-2xl font-extrabold">¡Intercambio listo!</h1>
          <p className="mt-1 text-sm text-slate-400">{st?.name} · Casillero {lastSwap.lockerId}</p>

          <div className="mt-8 w-full space-y-3">
            <div className="flex items-center justify-between rounded-2xl border border-swapy-400/30 bg-swapy-400/10 p-4">
              <div className="flex items-center gap-3">
                <BatteryFull className="text-swapy-400" />
                <div className="text-left">
                  <p className="text-xs text-slate-400">Batería nueva</p>
                  <p className="font-mono text-sm">{lastSwap.newBattery.id}</p>
                </div>
              </div>
              <p className="text-2xl font-extrabold text-swapy-400">{Math.round(lastSwap.newBattery.soc)}%</p>
            </div>
            <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-left">
              <div>
                <p className="text-xs text-slate-400">Batería entregada</p>
                <p className="font-mono text-sm text-slate-300">{lastSwap.oldBattery.id} · {lastSwap.oldBattery.soc}%</p>
              </div>
              <span className="text-xs text-amber-400">Cargando en {lastSwap.lockerId}</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm text-slate-300">
              <div className="flex items-center justify-center gap-2 rounded-2xl bg-white/[0.03] p-3">
                <Timer size={16} className="text-swapy-400" />
                <span className="font-bold text-white">{formatDuration(lastSwap.durationMs)}</span> total
              </div>
              <div className="flex items-center justify-center gap-2 rounded-2xl bg-white/[0.03] p-3">
                <Receipt size={16} className="text-swapy-400" />
                <span className="font-bold text-white">{cop(lastSwap.charged)}</span> cobrado
              </div>
            </div>
            <p className="flex items-center justify-center gap-1.5 text-xs text-slate-500">
              <Wallet size={12} /> Saldo restante {cop(user.balance)}
            </p>
          </div>
        </div>
        <button onClick={() => navigate('/app')} className="mt-8 w-full rounded-2xl bg-swapy-400 py-4 font-bold text-ink-950">
          Volver a rodar
        </button>
      </div>
    )
  }

  // ---- reserva cancelada por bloqueo de seguridad ----
  if (!reservation && cancelled) {
    return (
      <div className="flex min-h-full flex-col px-5 pb-10 pt-8">
        <div className="flex flex-1 flex-col items-center justify-center text-center">
          <div className="mb-6 grid h-24 w-24 place-items-center rounded-full bg-rose-500/15 text-rose-400">
            <ShieldAlert size={48} />
          </div>
          <h1 className="text-2xl font-extrabold">Reserva cancelada</h1>
          <p className="mt-2 max-w-xs text-sm text-slate-400">
            El sistema IoT detectó una anomalía y bloqueó el casillero preventivamente para protegerte.
          </p>
          <p className="mt-4 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">{cancelled.reason}</p>
        </div>
        <button
          onClick={() => {
            const id = cancelled.stationId
            dismissCancelled()
            navigate(`/app/station/${id}`)
          }}
          className="w-full rounded-2xl bg-swapy-400 py-4 font-bold text-ink-950"
        >
          Reservar otra batería
        </button>
      </div>
    )
  }

  if (!reservation) return <Navigate to="/app" replace />

  // ---- reserva activa con QR ----
  const station = stations.find((s) => s.id === reservation.stationId)
  const qrValue = JSON.stringify({ t: reservation.token, s: reservation.stationId, l: reservation.lockerId, b: reservation.batteryId })
  const unlocking = phase === 'unlocking'

  const handleScan = () => {
    setPhase('unlocking')
    setTimeout(() => {
      // fase primero: así al vaciarse la reserva no se dispara el <Navigate> de "sin reserva"
      setPhase('done')
      if (!completeSwap()) setPhase('reserved')
    }, 1600)
  }

  return (
    <div className="px-5 pb-10 pt-8">
      <button onClick={() => navigate('/app')} className="mb-4 flex items-center gap-1.5 text-sm text-slate-400 hover:text-white">
        <ArrowLeft size={16} /> Inicio
      </button>

      <div className="mb-5 flex items-center gap-3">
        <CheckCircle2 className="text-swapy-400" size={28} />
        <div>
          <h1 className="text-xl font-extrabold leading-tight">¡Batería reservada!</h1>
          <p className="text-xs text-slate-400">Muestra este código en el casillero</p>
        </div>
      </div>

      {/* tarjeta QR */}
      <section className="relative overflow-hidden rounded-3xl bg-white p-5 text-ink-950">
        <div className="mb-4 flex items-start justify-between">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">Casillero</p>
            <p className="text-5xl font-black leading-none">{reservation.lockerId}</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">Expira en</p>
            <p className={`flex items-center justify-end gap-1 font-mono text-2xl font-bold ${remaining < 120000 ? 'text-rose-600' : ''}`}>
              <Clock size={18} /> {formatDuration(remaining)}
            </p>
          </div>
        </div>

        <div className="relative mx-auto w-fit rounded-2xl border-2 border-dashed border-slate-200 p-3">
          <QRCodeSVG value={qrValue} size={200} level="M" fgColor="#0b1020" />
          {unlocking && (
            <div className="absolute inset-0 overflow-hidden rounded-2xl">
              <div className="absolute inset-x-0 h-1 animate-[scan_1.2s_ease-in-out_infinite] bg-swapy-500 shadow-[0_0_20px_4px_rgba(132,204,22,0.7)]" />
            </div>
          )}
        </div>

        <button
          onClick={() => navigator.clipboard?.writeText(reservation.token)}
          className="mx-auto mt-4 flex items-center gap-2 rounded-xl bg-slate-100 px-4 py-2 font-mono text-lg font-bold tracking-[0.2em]"
        >
          {reservation.token} <Copy size={14} className="text-slate-400" />
        </button>

        {/* troquel tipo ticket */}
        <div className="absolute -left-3 top-[60%] h-6 w-6 rounded-full bg-ink-900" />
        <div className="absolute -right-3 top-[60%] h-6 w-6 rounded-full bg-ink-900" />
      </section>

      {/* info */}
      <section className="mt-4 space-y-2 rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm">
        <Row icon={<MapPin size={14} />} label="Estación" value={station?.name} />
        <Row icon={<Zap size={14} />} label="Batería" value={reservation.batteryId} mono />
        <Row icon={<Wallet size={14} />} label="Costo al cambiar" value={cop(PRICING.SWAP_COP)} />
      </section>

      {/* pasos */}
      <ol className="mt-4 grid grid-cols-3 gap-2 text-center text-[11px] text-slate-400">
        {['Escanea el QR', 'Deja tu batería', 'Toma la nueva'].map((t, i) => (
          <li key={t} className="rounded-xl bg-white/[0.03] p-2">
            <span className="mx-auto mb-1 grid h-5 w-5 place-items-center rounded-full bg-swapy-400/20 text-[10px] font-bold text-swapy-400">{i + 1}</span>
            {t}
          </li>
        ))}
      </ol>

      <button
        onClick={handleScan}
        disabled={unlocking}
        className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-swapy-400 py-4 font-bold text-ink-950 shadow-xl shadow-swapy-400/20 transition active:scale-[0.98] disabled:opacity-80"
      >
        {unlocking ? <><LockOpen size={20} className="animate-bounce" /> Abriendo casillero {reservation.lockerId}…</> : <><ScanLine size={20} /> Simular escaneo en casillero</>}
      </button>
      <button
        onClick={() => { cancelReservation(); navigate('/app') }}
        disabled={unlocking}
        className="mt-2 w-full py-3 text-sm text-slate-400 hover:text-rose-300"
      >
        Cancelar reserva
      </button>
    </div>
  )
}

function Row({ icon, label, value, mono }) {
  return (
    <div className="flex items-center justify-between">
      <span className="flex items-center gap-2 text-slate-400">{icon} {label}</span>
      <span className={mono ? 'font-mono' : 'font-semibold'}>{value}</span>
    </div>
  )
}
