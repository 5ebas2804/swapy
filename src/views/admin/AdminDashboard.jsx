import { useEffect, useMemo, useState } from 'react'
import { Activity, Battery, CalendarClock, Cloud, Cpu, HeartPulse, Lock, Radio, Timer, Wifi, Zap } from 'lucide-react'
import { useSwapyStore } from '../../store/useSwapyStore'
import { SAFETY } from '../../data/mockData'
import BatteryCard from '../../components/admin/BatteryCard'
import DemoPanel from '../../components/admin/DemoPanel'
import EventLog from '../../components/admin/EventLog'
import LockAlert from '../../components/admin/LockAlert'
import OperatorPanel from '../../components/admin/OperatorPanel'
import ReservationsPanel from '../../components/admin/ReservationsPanel'
import TelemetryChart, { SERIES_COLORS, STATUS } from '../../components/admin/TelemetryChart'

const NODE_INFO = {
  'ST-CHA-01': { node: 'ESP32-CHA-01', rssi: -58 },
  'ST-ZNT-02': { node: 'ESP32-ZNT-02', rssi: -64 },
  'ST-TEU-03': { node: 'ESP32-TEU-03', rssi: -81 },
}

export default function AdminDashboard() {
  const stations = useSwapyStore((s) => s.stations)
  const batteries = useSwapyStore((s) => s.batteries)
  const events = useSwapyStore((s) => s.events)
  const history = useSwapyStore((s) => s.history)
  const reservations = useSwapyStore((s) => s.reservations)
  const users = useSwapyStore((s) => s.users)

  const [stationId, setStationId] = useState(stations[0].id)
  const [selectedId, setSelectedId] = useState(null)
  const [clock, setClock] = useState(Date.now())

  useEffect(() => {
    const t = setInterval(() => setClock(Date.now()), 1000)
    return () => clearInterval(t)
  }, [])

  const stationBatteries = useMemo(
    () => batteries.filter((b) => b.stationId === stationId).sort((a, b) => a.lockerId.localeCompare(b.lockerId)),
    [batteries, stationId],
  )
  const selected = stationBatteries.find((b) => b.id === selectedId) ?? stationBatteries[0]
  const station = stations.find((s) => s.id === stationId)
  const node = NODE_INFO[stationId]

  const kpis = useMemo(() => {
    const ready = batteries.filter((b) => b.status === 'ready').length
    const locked = batteries.filter((b) => b.status === 'locked').length
    const soh = batteries.reduce((a, b) => a + b.soh, 0) / batteries.length
    const lastLock = events.find((e) => e.latencyMs != null)
    return { total: batteries.length, ready, locked, soh, lastLatency: lastLock?.latencyMs }
  }, [batteries, events])

  const reservedBy = useMemo(() => {
    const map = {}
    for (const r of reservations) map[r.batteryId] = users.find((u) => u.id === r.userId)
    return map
  }, [reservations, users])

  const hist = (selected && history[selected.id]) || []
  const lockedCountFor = (id) => batteries.filter((b) => b.stationId === id && b.status === 'locked').length

  return (
    <div>
      <LockAlert events={events} stations={stations} />

      {/* encabezado */}
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-1 flex items-center gap-2 text-xs uppercase tracking-widest text-slate-500">
            <Cloud size={14} /> Swapy Cloud · Plataforma IoT
          </p>
          <h1 className="text-3xl font-black tracking-tight">Centro de control</h1>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <span className="flex items-center gap-2 rounded-full border border-swapy-400/30 bg-swapy-400/10 px-3 py-1.5 text-swapy-400">
            <span className="h-2 w-2 animate-pulse rounded-full bg-swapy-400" />
            Telemetría en vivo · {1000 / SAFETY.TELEMETRY_MS} Hz
          </span>
          <span className="font-mono text-slate-400">{new Date(clock).toLocaleTimeString('es-CO', { hour12: false })}</span>
        </div>
      </header>

      {/* KPIs */}
      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <Kpi icon={Battery} label="Baterías en red" value={kpis.total} />
        <Kpi icon={Zap} label="Listas para swap" value={kpis.ready} accent="text-swapy-400" />
        <Kpi icon={CalendarClock} label="Reservas activas" value={reservations.length} accent="text-sky-300" />
        <Kpi icon={HeartPulse} label="SoH promedio" value={`${kpis.soh.toFixed(1)}%`} />
        <Kpi
          icon={Lock}
          label="Casilleros bloqueados"
          value={kpis.locked}
          accent={kpis.locked ? 'text-rose-400' : undefined}
          alert={kpis.locked > 0}
        />
        <Kpi
          icon={Timer}
          label="Último bloqueo"
          value={kpis.lastLatency != null ? `${(kpis.lastLatency / 1000).toFixed(2)} s` : '—'}
          hint="meta < 2 s"
        />
      </div>

      {/* reservas */}
      <div className="mb-6">
        <ReservationsPanel onSelect={(stId, batteryId) => { setStationId(stId); setSelectedId(batteryId) }} />
      </div>

      {/* selector de estación */}
      <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
        {stations.map((s) => {
          const active = s.id === stationId
          const locks = lockedCountFor(s.id)
          return (
            <button
              key={s.id}
              onClick={() => { setStationId(s.id); setSelectedId(null) }}
              className={`flex shrink-0 items-center gap-2 rounded-xl border px-4 py-2 text-sm font-semibold transition ${
                active ? 'border-white/20 bg-white/10 text-white' : 'border-white/5 text-slate-400 hover:text-white'
              }`}
            >
              <span className={`h-2 w-2 rounded-full ${s.status === 'online' ? 'bg-swapy-400' : 'bg-slate-500'}`} />
              {s.name.replace('Swapy ', '')}
              {locks > 0 && <span className="flex items-center gap-0.5 rounded-full bg-rose-500 px-1.5 text-[10px] text-white"><Lock size={9} />{locks}</span>}
            </button>
          )
        })}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* columna principal */}
        <div className="space-y-6 lg:col-span-2">
          {/* nodo IoT */}
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-xs text-slate-400">
            <span className="flex items-center gap-1.5"><Cpu size={14} className="text-slate-300" /> <span className="font-mono text-slate-200">{node.node}</span> + TP4056</span>
            <span className="flex items-center gap-1.5"><Radio size={14} /> MQTT <span className="font-mono">swapy/{stationId.toLowerCase()}/telemetry</span></span>
            <span className="flex items-center gap-1.5"><Wifi size={14} /> {node.rssi} dBm</span>
            <span className={`ml-auto rounded-full px-2 py-0.5 font-semibold ${station.status === 'online' ? 'bg-swapy-400/15 text-swapy-400' : 'bg-slate-600/40 text-slate-300'}`}>
              {station.status === 'online' ? 'En línea' : 'Mantenimiento'}
            </span>
          </div>

          {/* casilleros */}
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {stationBatteries.map((b) => (
              <BatteryCard key={b.id} battery={b} reservedBy={reservedBy[b.id]} selected={b.id === selected?.id} onSelect={() => setSelectedId(b.id)} />
            ))}
          </div>

          {/* gráficas */}
          {selected && (
            <div className="grid gap-4 xl:grid-cols-2">
              <ChartCard
                title="Temperatura"
                subtitle={`${selected.lockerId} · ${selected.id}`}
                value={`${selected.temp.toFixed(1)} °C`}
                valueClass={selected.temp >= SAFETY.TEMP_CRITICAL ? 'text-rose-400' : selected.temp >= SAFETY.TEMP_WARN ? 'text-amber-300' : ''}
              >
                <TelemetryChart
                  data={hist}
                  unit="°C"
                  decimals={0}
                  yMin={20}
                  yMax={80}
                  ticks={[20, 40, 60, 80]}
                  series={[{ label: 'Temp.', color: SERIES_COLORS[0], get: (p) => p.temp }]}
                  thresholds={[
                    { value: SAFETY.TEMP_WARN, label: `Alerta ${SAFETY.TEMP_WARN} °C`, color: STATUS.warning },
                    { value: SAFETY.TEMP_CRITICAL, label: `Bloqueo ${SAFETY.TEMP_CRITICAL} °C`, color: STATUS.critical },
                  ]}
                />
              </ChartCard>

              <ChartCard
                title="Voltaje por celda"
                subtitle="Lecturas BMS · 4 celdas Li-ion"
                value={`${Math.min(...selected.cells).toFixed(2)} V mín.`}
                valueClass={Math.min(...selected.cells) <= SAFETY.CELL_V_CRITICAL ? 'text-rose-400' : ''}
                legend={selected.cells.map((_, i) => ({ label: `Celda ${i + 1}`, color: SERIES_COLORS[i] }))}
              >
                <TelemetryChart
                  data={hist}
                  unit="V"
                  decimals={1}
                  yMin={2.8}
                  yMax={4.4}
                  ticks={[2.8, 3.2, 3.6, 4.0, 4.4]}
                  band={{ from: SAFETY.CELL_V_MIN, to: SAFETY.CELL_V_MAX, label: 'Operación normal 3.7–4.2 V' }}
                  series={selected.cells.map((_, i) => ({ label: `Celda ${i + 1}`, color: SERIES_COLORS[i], get: (p) => p.cells[i] }))}
                  thresholds={[{ value: SAFETY.CELL_V_CRITICAL, label: `Bloqueo ${SAFETY.CELL_V_CRITICAL.toFixed(1)} V`, color: STATUS.critical }]}
                />
              </ChartCard>
            </div>
          )}
        </div>

        {/* columna lateral */}
        <aside className="space-y-6">
          <OperatorPanel battery={selected} />
          <DemoPanel battery={selected} />
          <EventLog events={events} />
        </aside>
      </div>
    </div>
  )
}

function Kpi({ icon: Icon, label, value, accent = 'text-white', hint, alert, className = '' }) {
  return (
    <div className={`rounded-2xl border p-4 ${alert ? 'border-rose-500/50 bg-rose-500/10' : 'border-white/10 bg-white/[0.03]'} ${className}`}>
      <p className="mb-2 flex items-center gap-1.5 text-xs text-slate-400"><Icon size={14} /> {label}</p>
      <p className={`text-2xl font-black tabular-nums ${accent}`}>{value}</p>
      {hint && <p className="text-[11px] text-slate-500">{hint}</p>}
    </div>
  )
}

function ChartCard({ title, subtitle, value, valueClass = '', legend, children }) {
  return (
    <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <h3 className="flex items-center gap-2 font-bold"><Activity size={16} className="text-slate-400" /> {title}</h3>
          <p className="text-xs text-slate-500">{subtitle}</p>
        </div>
        <p className={`font-mono text-lg font-bold ${valueClass}`}>{value}</p>
      </div>
      {legend && (
        <div className="mb-2 flex flex-wrap gap-3 text-[11px] text-slate-400">
          {legend.map((l) => (
            <span key={l.label} className="flex items-center gap-1.5">
              <span className="h-0.5 w-4 rounded" style={{ background: l.color }} /> {l.label}
            </span>
          ))}
        </div>
      )}
      {children}
    </section>
  )
}
