import { useEffect, useState } from 'react'
import { BatteryWarning, CheckCircle2, FlaskConical, Flame, Loader2, RotateCcw, ShieldCheck } from 'lucide-react'
import { useSwapyStore } from '../../store/useSwapyStore'

// Panel para la exposición: inyecta fallas y muestra el tiempo de respuesta del bloqueo.
export default function DemoPanel({ battery }) {
  const injectFault = useSwapyStore((s) => s.injectFault)
  const resetDemo = useSwapyStore((s) => s.resetDemo)
  const [now, setNow] = useState(Date.now())

  const detecting = battery?.fault && battery.status !== 'locked'
  useEffect(() => {
    if (!detecting) return
    const t = setInterval(() => setNow(Date.now()), 50)
    return () => clearInterval(t)
  }, [detecting])

  if (!battery) return null
  const locked = battery.status === 'locked'
  const realSensor = !!battery.live?.online // con datos reales la falla se provoca en el hardware
  const busy = locked || !!battery.fault || realSensor
  const latency = locked && battery.faultInjectedAt ? battery.lockedAt - battery.faultInjectedAt : null
  const elapsed = detecting ? now - battery.faultInjectedAt : null

  return (
    <section className="rounded-3xl border border-white/10 bg-gradient-to-b from-ink-800/80 to-ink-900 p-5">
      <div className="mb-4 flex items-center gap-2">
        <FlaskConical size={18} className="text-violet-300" />
        <h2 className="font-bold">Panel de demostración</h2>
      </div>

      <p className="mb-3 text-xs text-slate-400">
        Objetivo: <span className="font-mono text-slate-200">{battery.lockerId} · {battery.id}</span>
      </p>

      {realSensor && (
        <p className="mb-3 rounded-xl bg-swapy-400/10 px-3 py-2 text-xs text-swapy-400">
          Este casillero usa el sensor real: el bloqueo se dispara con las lecturas del ESP32.
        </p>
      )}

      <div className="grid gap-2">
        <button
          onClick={() => injectFault(battery.id, 'overheat')}
          disabled={busy}
          className="flex items-center gap-3 rounded-2xl border border-orange-500/30 bg-orange-500/10 px-4 py-3 text-left font-semibold text-orange-200 transition hover:bg-orange-500/20 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Flame size={20} /> Simular sobrecalentamiento
        </button>
        <button
          onClick={() => injectFault(battery.id, 'undervoltage')}
          disabled={busy}
          className="flex items-center gap-3 rounded-2xl border border-yellow-500/30 bg-yellow-500/10 px-4 py-3 text-left font-semibold text-yellow-200 transition hover:bg-yellow-500/20 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <BatteryWarning size={20} /> Simular caída de voltaje
        </button>
      </div>

      {/* tiempo de respuesta */}
      <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-4">
        <p className="mb-2 text-[11px] uppercase tracking-wider text-slate-500">Tiempo de respuesta del sistema</p>
        {detecting ? (
          <div className="flex items-center gap-3">
            <Loader2 size={22} className="animate-spin text-amber-300" />
            <div>
              <p className="font-mono text-3xl font-black tabular-nums text-amber-300">{(elapsed / 1000).toFixed(2)} s</p>
              <p className="text-xs text-slate-400">ESP32 detectando anomalía…</p>
            </div>
          </div>
        ) : latency != null ? (
          <div className="flex items-center gap-3">
            <ShieldCheck size={26} className={latency < 2000 ? 'text-swapy-400' : 'text-rose-400'} />
            <div>
              <p className="font-mono text-3xl font-black tabular-nums">{(latency / 1000).toFixed(2)} s</p>
              <p className={`flex items-center gap-1 text-xs ${latency < 2000 ? 'text-swapy-400' : 'text-rose-300'}`}>
                <CheckCircle2 size={12} /> Casillero bloqueado {latency < 2000 ? '· meta < 2 s cumplida' : '· fuera de meta'}
              </p>
            </div>
          </div>
        ) : (
          <p className="text-sm text-slate-500">Inyecta una falla para medir el bloqueo preventivo.</p>
        )}
      </div>

      <button
        onClick={resetDemo}
        className="mt-4 flex w-full items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-white/5 py-2.5 text-xs font-semibold text-slate-200 transition hover:bg-white/10"
      >
        <RotateCcw size={14} /> Reiniciar demo (todas las pestañas)
      </button>
    </section>
  )
}
