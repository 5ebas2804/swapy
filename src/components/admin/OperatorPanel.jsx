import { useState } from 'react'
import { Ban, Lock, ShieldCheck, Wrench } from 'lucide-react'
import { useSwapyStore } from '../../store/useSwapyStore'
import { SAFETY } from '../../data/mockData'

const LOCK_REASONS = ['Mantenimiento programado', 'Daño físico en el casillero', 'Sospecha de manipulación', 'Inspección de calidad']

// Acciones manuales del operador sobre el casillero/batería seleccionados.
export default function OperatorPanel({ battery: b }) {
  const lockLocker = useSwapyStore((s) => s.lockLocker)
  const isolateCell = useSwapyStore((s) => s.isolateCell)
  const resetBattery = useSwapyStore((s) => s.resetBattery)
  const [reason, setReason] = useState(LOCK_REASONS[0])

  if (!b) return null
  const locked = b.status === 'locked'
  const faulted = locked || !!b.fault

  return (
    <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">
      <div className="mb-1 flex items-center gap-2">
        <Wrench size={18} className="text-sky-300" />
        <h2 className="font-bold">Control del casillero</h2>
      </div>
      <p className="mb-4 text-xs text-slate-400">
        <span className="font-mono text-slate-200">{b.lockerId} · {b.id}</span>
        {locked && <span className="ml-2 rounded bg-rose-500/20 px-1.5 py-0.5 text-[10px] font-semibold text-rose-300">{b.lockType === 'auto' ? 'BLOQUEO AUTOMÁTICO' : 'BLOQUEO MANUAL'}</span>}
      </p>

      {/* bloquear casillero */}
      <label className="mb-1 block text-[11px] uppercase tracking-wider text-slate-500">Bloquear casillero</label>
      <div className="mb-5 flex gap-2">
        <select
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          disabled={locked}
          className="min-w-0 flex-1 rounded-xl border border-white/10 bg-ink-900 px-3 py-2.5 text-sm outline-none focus:border-sky-400 disabled:opacity-40"
        >
          {LOCK_REASONS.map((r) => <option key={r}>{r}</option>)}
        </select>
        <button
          onClick={() => lockLocker(b.id, reason)}
          disabled={locked}
          className="flex shrink-0 items-center gap-1.5 rounded-xl bg-rose-600 px-4 text-sm font-bold text-white transition hover:bg-rose-500 disabled:bg-slate-700 disabled:text-slate-400"
        >
          <Lock size={15} /> Bloquear
        </button>
      </div>

      {/* aislar celdas */}
      <label className="mb-1 block text-[11px] uppercase tracking-wider text-slate-500">Aislar celda de la batería</label>
      <div className="mb-5 grid grid-cols-4 gap-2">
        {b.cells.map((v, i) => {
          const isolated = b.isolatedCells.includes(i)
          const weak = v < SAFETY.CELL_V_MIN
          return (
            <button
              key={i}
              onClick={() => isolateCell(b.id, i)}
              disabled={isolated}
              title={isolated ? 'Celda aislada' : `Aislar celda ${i + 1}`}
              className={`rounded-xl border p-2 text-center transition ${
                isolated
                  ? 'border-rose-500/50 bg-[repeating-linear-gradient(45deg,rgba(208,59,59,0.25)_0_6px,transparent_6px_12px)] text-rose-200'
                  : weak
                    ? 'border-amber-400/40 bg-amber-400/10 hover:bg-amber-400/20'
                    : 'border-white/10 hover:border-rose-400/40 hover:bg-rose-500/10'
              }`}
            >
              <p className="text-[10px] text-slate-400">Celda {i + 1}</p>
              <p className="font-mono text-xs font-bold">{v.toFixed(2)} V</p>
              <p className="mt-0.5 flex items-center justify-center gap-0.5 text-[9px] font-semibold uppercase">
                {isolated ? <><Ban size={9} /> Aislada</> : 'Aislar'}
              </p>
            </button>
          )
        })}
      </div>

      <button
        onClick={() => resetBattery(b.id)}
        disabled={!faulted}
        className="flex w-full items-center justify-center gap-2 rounded-xl border border-swapy-400/30 bg-swapy-400/10 py-2.5 text-sm font-semibold text-swapy-400 transition hover:bg-swapy-400/20 disabled:border-white/10 disabled:bg-transparent disabled:text-slate-500"
      >
        <ShieldCheck size={16} /> Rehabilitar tras inspección
      </button>
    </section>
  )
}
