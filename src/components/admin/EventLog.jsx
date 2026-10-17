import { AlertTriangle, CheckCircle2, Info, ListTree, OctagonAlert } from 'lucide-react'

const LEVEL = {
  info: { icon: Info, color: 'text-sky-300', label: 'Info' },
  success: { icon: CheckCircle2, color: 'text-swapy-400', label: 'OK' },
  warning: { icon: AlertTriangle, color: 'text-amber-300', label: 'Aviso' },
  critical: { icon: OctagonAlert, color: 'text-rose-400', label: 'Crítico' },
}

const hhmmss = (t) => new Date(t).toLocaleTimeString('es-CO', { hour12: false })

export default function EventLog({ events }) {
  return (
    <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">
      <div className="mb-3 flex items-center gap-2">
        <ListTree size={18} className="text-slate-400" />
        <h2 className="font-bold">Bitácora IoT</h2>
        <span className="ml-auto text-xs text-slate-500">{events.length} eventos</span>
      </div>
      {events.length === 0 ? (
        <p className="py-6 text-center text-sm text-slate-500">Sin eventos todavía.</p>
      ) : (
        <ul className="max-h-72 space-y-2 overflow-y-auto pr-1">
          {events.map((e) => {
            const L = LEVEL[e.level] ?? LEVEL.info
            const Icon = L.icon
            return (
              <li key={e.id} className="flex gap-2.5 rounded-xl bg-black/20 p-2.5 text-xs">
                <Icon size={15} className={`mt-0.5 shrink-0 ${L.color}`} aria-label={L.label} />
                <div className="min-w-0 flex-1">
                  <p className="text-slate-200">{e.message}</p>
                  <p className="mt-0.5 font-mono text-[10px] text-slate-500">
                    {hhmmss(e.at)}
                    {e.latencyMs != null && <span className="ml-2 text-rose-300">respuesta {(e.latencyMs / 1000).toFixed(2)} s</span>}
                  </p>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
