import { useEffect, useState } from 'react'
import { Lock, X } from 'lucide-react'

// Banner grande que aparece cuando el sistema bloquea un casillero (visible desde lejos en la exposición).
export default function LockAlert({ events, stations }) {
  const latest = events.find((e) => e.level === 'critical')
  const [visibleId, setVisibleId] = useState(null)

  useEffect(() => {
    if (!latest || Date.now() - latest.at > 3000) return
    setVisibleId(latest.id)
    const t = setTimeout(() => setVisibleId(null), 7000)
    return () => clearTimeout(t)
  }, [latest])

  if (!latest || visibleId !== latest.id) return null
  const station = stations.find((s) => s.id === latest.stationId)

  return (
    <div className="fixed inset-x-0 top-16 z-40 mx-auto w-[min(640px,calc(100%-2rem))] animate-[alert-in_0.25s_ease-out]">
      <div className="flex items-center gap-4 rounded-2xl border border-rose-400/50 bg-rose-600 p-4 text-white shadow-2xl shadow-rose-900/50">
        <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-white/15">
          <Lock size={26} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-rose-100">Bloqueo preventivo · {station?.name}</p>
          <p className="font-bold">{latest.message}</p>
        </div>
        {latest.latencyMs != null && (
          <div className="text-right">
            <p className="font-mono text-2xl font-black leading-none">{(latest.latencyMs / 1000).toFixed(2)}s</p>
            <p className="text-[10px] uppercase text-rose-100">respuesta</p>
          </div>
        )}
        <button onClick={() => setVisibleId(null)} aria-label="Cerrar" className="text-rose-100 hover:text-white"><X size={18} /></button>
      </div>
    </div>
  )
}
