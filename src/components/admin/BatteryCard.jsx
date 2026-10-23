import { BatteryCharging, CheckCircle2, Clock, HeartPulse, Lock, Nfc, Radio, Thermometer } from 'lucide-react'
import { SAFETY } from '../../data/mockData'
import Avatar from '../Avatar'

const STATUS = {
  ready: { label: 'Lista', icon: CheckCircle2, chip: 'bg-swapy-400/15 text-swapy-400' },
  charging: { label: 'Cargando', icon: BatteryCharging, chip: 'bg-amber-400/15 text-amber-300' },
  reserved: { label: 'Reservada', icon: Clock, chip: 'bg-sky-400/15 text-sky-300' },
  locked: { label: 'Bloqueada', icon: Lock, chip: 'bg-rose-500/20 text-rose-300' },
}

// Posición de un voltaje en la escala 3.5–4.25 V: exagera la diferencia entre celdas sanas.
const cellPct = (v) => Math.max(4, Math.min(100, ((v - 3.5) / (4.25 - 3.5)) * 100))

export default function BatteryCard({ battery: b, reservedBy, selected, onSelect }) {
  const st = STATUS[b.status]
  const Icon = st.icon
  const locked = b.status === 'locked'
  const hot = b.temp >= SAFETY.TEMP_WARN
  const detecting = b.fault && !locked

  return (
    <button
      onClick={onSelect}
      className={`relative w-full overflow-hidden rounded-2xl border p-4 text-left transition ${
        locked
          ? 'border-rose-500/60 bg-rose-500/10 shadow-[0_0_30px_-8px_rgba(208,59,59,0.6)]'
          : detecting
            ? 'border-amber-400/60 bg-amber-400/5'
            : selected
              ? 'border-sky-400/60 bg-white/[0.06]'
              : 'border-white/10 bg-white/[0.03] hover:bg-white/[0.05]'
      } ${selected ? 'ring-2 ring-sky-400/50' : ''}`}
    >
      {locked && <div className="pointer-events-none absolute inset-0 animate-pulse bg-rose-500/5" />}

      <div className="relative mb-3 flex items-start justify-between">
        <div>
          <p className="text-2xl font-black leading-none">{b.lockerId}</p>
          <p className="mt-1 font-mono text-[11px] text-slate-500">{b.id}</p>
        </div>
        <span className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${st.chip}`}>
          <Icon size={12} /> {st.label}
        </span>
      </div>

      {b.live && <LiveSensor live={b.live} />}

      {/* SoC */}
      <div className="relative mb-3">
        <div className="mb-1 flex justify-between text-[11px] text-slate-400">
          <span>SoC</span>
          <span className="font-mono text-slate-200">{b.soc.toFixed(1)} %</span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
          <div className={`h-full rounded-full ${locked ? 'bg-rose-500' : 'bg-swapy-400'}`} style={{ width: `${b.soc}%` }} />
        </div>
      </div>

      {/* celdas */}
      <div className="relative mb-3 grid gap-1.5" style={{ gridTemplateColumns: `repeat(${b.cells.length}, minmax(0, 1fr))` }}>
        {b.cells.map((v, i) => {
          const bad = v <= SAFETY.CELL_V_CRITICAL
          const low = v < SAFETY.CELL_V_MIN
          const isolated = b.isolatedCells?.includes(i)
          return (
            <div key={i} className="text-center">
              <div className="relative mx-auto mb-1 h-10 w-full overflow-hidden rounded-md bg-white/5">
                {isolated ? (
                  <div className="absolute inset-0 grid place-items-center rounded-md border border-rose-500/50 bg-[repeating-linear-gradient(45deg,rgba(208,59,59,0.3)_0_5px,transparent_5px_10px)] text-[9px] font-bold text-rose-200">
                    AISL.
                  </div>
                ) : (
                  <div
                    className={`absolute inset-x-0 bottom-0 rounded-md transition-all duration-300 ${bad ? 'bg-rose-500' : low ? 'bg-amber-400' : 'bg-sky-400/70'}`}
                    style={{ height: `${cellPct(v)}%` }}
                  />
                )}
              </div>
              <p className={`font-mono text-[10px] ${bad ? 'font-bold text-rose-300' : isolated ? 'text-rose-300 line-through' : 'text-slate-400'}`}>{v.toFixed(2)}</p>
            </div>
          )
        })}
      </div>

      <div className="relative flex items-center justify-between text-xs">
        <span className={`flex items-center gap-1 font-mono ${locked && b.fault === 'overheat' ? 'font-bold text-rose-300' : hot ? 'text-amber-300' : 'text-slate-300'}`}>
          <Thermometer size={13} /> {b.temp.toFixed(1)} °C
        </span>
        <span className="flex items-center gap-1 text-slate-400">
          <HeartPulse size={13} /> SoH {b.soh}%
        </span>
        <span className="text-slate-500">{b.cycles} ciclos</span>
      </div>

      {reservedBy && b.status === 'reserved' && (
        <div className="relative mt-3 flex items-center gap-2 rounded-lg bg-sky-400/10 px-2 py-1.5">
          <Avatar user={reservedBy} size="xs" />
          <p className="min-w-0 truncate text-[11px] text-sky-200">{reservedBy.email}</p>
        </div>
      )}

      {locked && (
        <p className="relative mt-3 rounded-lg bg-rose-500/15 px-2 py-1.5 text-[11px] text-rose-200">{b.lockReason}</p>
      )}
    </button>
  )
}

// Lecturas del ESP32 real (INA219 + RC522) para el casillero que tiene el sensor.
function LiveSensor({ live }) {
  return (
    <div className="relative mb-3 rounded-lg border border-white/10 bg-black/20 px-2 py-1.5 text-[11px]">
      <p className={`flex items-center gap-1.5 font-semibold ${live.online ? 'text-swapy-400' : 'text-slate-400'}`}>
        <span className={`h-1.5 w-1.5 rounded-full ${live.online ? 'animate-pulse bg-swapy-400' : 'bg-slate-500'}`} />
        <Radio size={11} />
        {live.online ? 'Sensor real · en vivo' : 'Sensor sin señal · simulado'}
      </p>
      {live.online && (
        live.present ? (
          <p className="mt-1 flex justify-between font-mono text-slate-300">
            <span>{live.loadV.toFixed(2)} V</span>
            <span>{live.mA.toFixed(0)} mA</span>
            <span>{live.mW.toFixed(0)} mW</span>
          </p>
        ) : (
          <p className="mt-1 text-amber-300">Sin batería conectada al INA219</p>
        )
      )}
      {live.uid && (
        <p className="mt-1 flex items-center gap-1 text-slate-400">
          <Nfc size={11} /> RFID <span className="font-mono text-slate-200">{live.uid}</span>
        </p>
      )}
    </div>
  )
}
