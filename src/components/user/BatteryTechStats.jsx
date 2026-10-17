import { Activity, Gauge, HeartPulse, Repeat, Thermometer, Zap } from 'lucide-react'
import { PACK_SPEC, SAFETY } from '../../data/mockData'
import { socText } from './ui'

const SOH_FLOOR = 70 // por debajo de este SoH la batería se retira de la flota
const SOH_LOSS_PER_CYCLE = 0.025

export const healthLabel = (soh) =>
  soh >= 90 ? { text: 'Excelente', cls: 'bg-swapy-400/15 text-swapy-400' }
    : soh >= 80 ? { text: 'Buena', cls: 'bg-sky-400/15 text-sky-300' }
      : { text: 'Requiere revisión', cls: 'bg-amber-400/15 text-amber-300' }

// Ficha técnica de una batería: métricas derivadas del BMS + voltajes por celda.
export default function BatteryTechStats({ battery: b }) {
  const avgCell = b.cells.reduce((a, v) => a + v, 0) / b.cells.length
  const spreadMv = Math.round((Math.max(...b.cells) - Math.min(...b.cells)) * 1000)
  const energyWh = Math.round(PACK_SPEC.capacityWh * (b.soh / 100) * (b.soc / 100))
  const rangeKm = Math.round(b.soc * PACK_SPEC.kmPerSoc * (b.soh / 100))
  const packV = (avgCell * 13).toFixed(1)
  const cyclesLeft = Math.max(0, Math.round((b.soh - SOH_FLOOR) / SOH_LOSS_PER_CYCLE))
  const health = healthLabel(b.soh)

  return (
    <div>
      {/* indicador principal */}
      <div className="mb-5 flex items-center gap-5">
        <Ring value={b.soc} />
        <div className="min-w-0">
          <p className="font-mono text-xs text-slate-500">{b.id}</p>
          <p className="text-sm text-slate-400">Estado de carga (SoC)</p>
          <p className="mt-1 text-sm">
            <span className="font-bold text-white">{rangeKm} km</span> <span className="text-slate-400">de autonomía estimada</span>
          </p>
          <span className={`mt-2 inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold ${health.cls}`}>Salud {health.text}</span>
        </div>
      </div>

      {/* métricas */}
      <div className="mb-5 grid grid-cols-2 gap-2">
        <Metric icon={HeartPulse} label="Salud (SoH)" value={`${b.soh}%`} hint={`${cyclesLeft} ciclos de vida útil restantes`} />
        <Metric icon={Zap} label="Energía disponible" value={`${energyWh} Wh`} hint={`de ${PACK_SPEC.capacityWh} Wh nominales`} />
        <Metric icon={Gauge} label="Voltaje del paquete" value={`${packV} V`} hint={`nominal ${PACK_SPEC.nominalV} V`} />
        <Metric
          icon={Thermometer}
          label="Temperatura"
          value={`${b.temp.toFixed(1)} °C`}
          hint={b.temp >= SAFETY.TEMP_WARN ? 'Elevada' : 'Rango normal'}
          warn={b.temp >= SAFETY.TEMP_WARN}
        />
        <Metric icon={Repeat} label="Ciclos de carga" value={b.cycles} hint="cargas completas" />
        <Metric icon={Activity} label="Balance de celdas" value={`${spreadMv} mV`} hint={spreadMv <= 30 ? 'Balanceadas' : 'Desbalance'} warn={spreadMv > 30} />
      </div>

      {/* celdas */}
      <div className="mb-5 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-sm font-semibold">Voltaje por grupo de celdas</p>
          <p className="text-[11px] text-slate-500">normal {SAFETY.CELL_V_MIN}–{SAFETY.CELL_V_MAX} V</p>
        </div>
        <div className="space-y-2">
          {b.cells.map((v, i) => {
            const pct = Math.max(3, Math.min(100, ((v - 3.0) / (SAFETY.CELL_V_MAX - 3.0)) * 100))
            const bad = v <= SAFETY.CELL_V_CRITICAL
            const low = v < SAFETY.CELL_V_MIN
            return (
              <div key={i} className="flex items-center gap-3 text-xs">
                <span className="w-12 text-slate-400">Celda {i + 1}</span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/10">
                  <div className={`h-full rounded-full ${bad ? 'bg-rose-500' : low ? 'bg-amber-400' : 'bg-sky-400'}`} style={{ width: `${pct}%` }} />
                </div>
                <span className={`w-14 text-right font-mono ${bad ? 'text-rose-300' : 'text-slate-200'}`}>{v.toFixed(3)} V</span>
              </div>
            )
          })}
        </div>
      </div>

      {/* especificaciones */}
      <dl className="grid grid-cols-2 gap-x-4 gap-y-2 rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-xs">
        <Spec label="Química" value={PACK_SPEC.chemistry} />
        <Spec label="Configuración" value={PACK_SPEC.config} />
        <Spec label="Capacidad" value={`${PACK_SPEC.capacityAh} Ah · ${PACK_SPEC.capacityWh} Wh`} />
        <Spec label="BMS" value="ESP32 + TP4056" />
        <Spec label="Autonomía máx." value={`${Math.round(100 * PACK_SPEC.kmPerSoc)} km`} />
        <Spec label="Retiro de flota" value={`SoH < ${SOH_FLOOR}%`} />
      </dl>
    </div>
  )
}

function Ring({ value }) {
  const r = 42
  const c = 2 * Math.PI * r
  return (
    <div className="relative h-28 w-28 shrink-0">
      <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
        <circle cx="50" cy="50" r={r} fill="none" stroke="currentColor" strokeWidth="8" className="text-white/10" />
        <circle cx="50" cy="50" r={r} fill="none" stroke="currentColor" strokeWidth="8" strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c * (1 - value / 100)} className={`${socText(value)} transition-all duration-500`} />
      </svg>
      <div className="absolute inset-0 grid place-items-center">
        <p className={`text-2xl font-black ${socText(value)}`}>{Math.round(value)}%</p>
      </div>
    </div>
  )
}

function Metric({ icon: Icon, label, value, hint, warn }) {
  return (
    <div className={`rounded-2xl border p-3 ${warn ? 'border-amber-400/30 bg-amber-400/5' : 'border-white/10 bg-white/[0.03]'}`}>
      <p className="mb-1 flex items-center gap-1.5 text-[11px] text-slate-400"><Icon size={13} /> {label}</p>
      <p className="text-lg font-extrabold leading-tight">{value}</p>
      <p className={`text-[10px] ${warn ? 'text-amber-300' : 'text-slate-500'}`}>{hint}</p>
    </div>
  )
}

function Spec({ label, value }) {
  return (
    <div>
      <dt className="text-slate-500">{label}</dt>
      <dd className="text-slate-200">{value}</dd>
    </div>
  )
}

