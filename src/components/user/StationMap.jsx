import { Zap } from 'lucide-react'

// Mapa estilizado (no es un mapa real): proyecta lat/lng a un recuadro del norte de Bogotá.
const BOUNDS = { minLat: 4.618, maxLat: 4.676, minLng: -74.088, maxLng: -74.044 }

const project = ({ lat, lng }) => ({
  x: ((lng - BOUNDS.minLng) / (BOUNDS.maxLng - BOUNDS.minLng)) * 100,
  y: ((BOUNDS.maxLat - lat) / (BOUNDS.maxLat - BOUNDS.minLat)) * 100,
})

export default function StationMap({ stations, availability, rider, selectedId, onSelect }) {
  const me = project(rider.coords)

  return (
    <div className="relative h-56 overflow-hidden rounded-3xl border border-white/10 bg-[#0e1530]">
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 h-full w-full">
        {/* cerros orientales y parque */}
        <path d="M86 0 L100 0 L100 100 L92 100 Q84 60 88 30 Z" fill="#14321f" opacity="0.7" />
        <rect x="44" y="44" width="10" height="8" rx="2" fill="#173a24" opacity="0.8" />
        {/* cuadrícula de calles */}
        {[12, 24, 36, 48, 60, 72, 84].map((v) => (
          <g key={v} stroke="#1c2752" strokeWidth="0.4">
            <line x1="0" y1={v} x2="100" y2={v} />
            <line x1={v} y1="0" x2={v} y2="100" />
          </g>
        ))}
        {/* vías principales */}
        <path d="M70 0 Q66 50 60 100" stroke="#2b3a78" strokeWidth="1.6" fill="none" /> {/* Cra 7 */}
        <path d="M44 0 Q42 50 30 100" stroke="#2b3a78" strokeWidth="1.6" fill="none" /> {/* Av Caracas */}
        <path d="M0 40 L100 34" stroke="#2b3a78" strokeWidth="1.3" fill="none" /> {/* Cl 72 */}
        <path d="M0 86 L100 78" stroke="#2b3a78" strokeWidth="1.3" fill="none" /> {/* Cl 26 */}
        {/* ruta hacia la estación seleccionada */}
        {selectedId &&
          (() => {
            const s = stations.find((st) => st.id === selectedId)
            const p = project(s.coords)
            return (
              <line x1={me.x} y1={me.y} x2={p.x} y2={p.y} stroke="#a3e635" strokeWidth="0.8"
                strokeDasharray="2 1.5" vectorEffect="non-scaling-stroke" />
            )
          })()}
      </svg>

      <span className="absolute left-3 top-3 rounded-full bg-black/40 px-2.5 py-1 text-[10px] font-medium uppercase tracking-wider text-slate-300 backdrop-blur">
        Bogotá · Norte
      </span>

      {/* repartidor */}
      <div className="absolute -translate-x-1/2 -translate-y-1/2" style={{ left: `${me.x}%`, top: `${me.y}%` }}>
        <span className="absolute inset-0 -m-2 animate-ping rounded-full bg-sky-400/40" />
        <span className="relative block h-3.5 w-3.5 rounded-full border-2 border-white bg-sky-500 shadow-lg" />
      </div>

      {/* estaciones */}
      {stations.map((s) => {
        const p = project(s.coords)
        const count = availability[s.id] ?? 0
        const offline = s.status !== 'online'
        const selected = s.id === selectedId
        return (
          <button
            key={s.id}
            onClick={() => onSelect?.(s.id)}
            className="absolute -translate-x-1/2 -translate-y-full"
            style={{ left: `${p.x}%`, top: `${p.y}%` }}
          >
            <div
              className={`flex items-center gap-1 rounded-full px-2 py-1 text-xs font-bold shadow-lg transition ${
                offline ? 'bg-slate-600 text-slate-200' : selected ? 'scale-110 bg-white text-ink-950' : 'bg-swapy-400 text-ink-950'
              }`}
            >
              <Zap size={12} fill="currentColor" /> {offline ? '—' : count}
            </div>
            <div className={`mx-auto h-2 w-0.5 ${offline ? 'bg-slate-600' : selected ? 'bg-white' : 'bg-swapy-400'}`} />
          </button>
        )
      })}
    </div>
  )
}
