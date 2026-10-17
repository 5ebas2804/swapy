import { X } from 'lucide-react'
import BatteryTechStats from './BatteryTechStats'
import { LOCKER_STYLES } from './ui'

// Hoja inferior con la ficha técnica de una batería de la estación (datos en vivo).
export default function BatteryTechSheet({ battery, onClose }) {
  const st = LOCKER_STYLES[battery.status]
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="max-h-[88vh] w-full max-w-md animate-[sheet-in_0.25s_ease-out] overflow-y-auto rounded-t-3xl border-t border-white/10 bg-ink-900 p-5"
      >
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-white/20" />
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold">Casillero {battery.lockerId}</h2>
            <p className="flex items-center gap-1.5 text-xs text-slate-400">
              <span className={`h-1.5 w-1.5 rounded-full ${st.dot}`} /> {st.label} · lectura en vivo
            </p>
          </div>
          <button onClick={onClose} aria-label="Cerrar" className="rounded-full bg-white/5 p-2 text-slate-400 hover:text-white"><X size={18} /></button>
        </div>
        {battery.status === 'locked' && (
          <p className="mb-4 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-200">{battery.lockReason}</p>
        )}
        <BatteryTechStats battery={battery} />
      </div>
    </div>
  )
}
